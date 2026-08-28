import createHttpError from "http-errors";
import UserModel from "./user.model.js";
import { generateToken } from "../../utils/jwt.js";
import { env } from "../../config/env.js";
import { buatOtp, buatResetToken, hashSha256, expiredDalamMenit } from "../../utils/otp.js";
import { kirimEmailResetPassword } from "../../utils/mails/mail.js";

/**
 * Login memakai satu field identifier: boleh username, boleh email.
 * Pesan error disamakan untuk user tidak ada / password salah,
 * supaya tidak membocorkan username atau email mana yang terdaftar.
 */
const login = async ({ identifier, password }) => {
  const user = await UserModel.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw createHttpError(401, "Username/email atau password salah");
  }

  if (!user.isActive) {
    throw createHttpError(403, "Akun Anda tidak aktif, hubungi admin");
  }

  const token = generateToken({
    id: user._id.toString(),
    role: user.role,
  });

  return { token, user };
};

const getProfile = async (userId) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw createHttpError(404, "User tidak ditemukan");
  }
  return user;
};

/**
 * Edit profil sendiri — partial update.
 * Hanya field yang dikirim yang diubah; sisanya dibiarkan apa adanya.
 *
 * Username dan email dicek manual dulu supaya pesan errornya jelas
 * ("username sudah dipakai" vs "email sudah dipakai"). Unique index
 * di schema tetap jadi pengaman terakhir kalau ada dua request bersamaan
 * — error 11000-nya ditangani error handler global.
 */
const editProfile = async (userId, { name, username, email }) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw createHttpError(404, "User tidak ditemukan");
  }

  if (username !== undefined && username !== user.username) {
    const dipakai = await UserModel.exists({ username, _id: { $ne: userId } });
    if (dipakai) {
      throw createHttpError(409, "Username sudah dipakai user lain");
    }
    user.username = username;
  }

  if (email !== undefined && email !== user.email) {
    const dipakai = await UserModel.exists({ email, _id: { $ne: userId } });
    if (dipakai) {
      throw createHttpError(409, "Email sudah dipakai user lain");
    }
    user.email = email;
  }

  if (name !== undefined) {
    user.name = name;
  }

  await user.save();
  return user;
};

/**
 * Ubah password sendiri. Wajib menyertakan password lama supaya token
 * yang dicuri tidak bisa langsung dipakai mengambil alih akun.
 *
 * Password baru di-hash otomatis oleh pre-save hook di user.model.js.
 */
const changePassword = async (userId, { oldPassword, newPassword }) => {
  const user = await UserModel.findById(userId).select("+password");
  if (!user) {
    throw createHttpError(404, "User tidak ditemukan");
  }

  const cocok = await user.comparePassword(oldPassword);
  if (!cocok) {
    throw createHttpError(401, "Password lama salah");
  }

  user.password = newPassword;
  await user.save();

  return user;
};

/**
 * === Lupa password (forgot / verify-otp / reset) ===
 *
 * Alur:
 *   1. POST /forgot-password { email }
 *      -> buat OTP + token reset, kirim email. Selalu jawab sukses walau
 *         email tidak terdaftar (anti user-enumeration).
 *   2. POST /verify-otp { email, otp }
 *      -> cek OTP cocok & belum kedaluwarsa. Bukan langkah wajib alur —
 *         dipakai FE untuk tombol "verifikasi kode" sebelum menampilkan
 *         form password baru.
 *   3. POST /reset-password { token, newPassword }
 *      -> token mentah dari link email. Berhasil = password berubah,
 *         OTP+token hangus (single-use).
 *
 * Keamanan:
 *   - DB hanya menyimpan hash sha256 (otp_hash, reset_token_hash) — nilai
 *     mentah hanya ada di email user.
 *   - Lookup OTP terikat ke email pemilik (bukan global) + batas waktu.
 *   - Akun nonaktif tidak boleh reset password sendiri — minta admin.
 */

const lupaPassword = async ({ email }) => {
  // +counter & window: keduanya select:false di model, wajib diminta eksplisit
  // — kalau tidak, guard per-email di bawah selalu membaca undefined dan
  // tidak pernah aktif.
  const user = await UserModel.findOne({ email }).select(
    "+forgot_request_count +forgot_window_started_at"
  );

  // Email tidak terdaftar: tetap 200 supaya tidak bisa dipakai menebak
  // alamat mana yang terdaftar. (UserModel.find tidak mengembalikan error,
  // jadi diam-diam skip kirim email.)
  if (user) {
    // Batas per email per jam (bergulir): penyerang dari banyak IP tetap
    // tidak bisa membombardir satu inbox. Respons tetap "sukses" generik —
    // kalau 429 di sini, jumlah hit yang diketahui penyerang akan jadi
    // orakel "email ini terdaftar".
    const SEJAM = 60 * 60 * 1000;
    const windowBaru =
      !user.forgot_window_started_at ||
      Date.now() - user.forgot_window_started_at.getTime() >= SEJAM;
    const count = windowBaru ? 0 : user.forgot_request_count;

    if (count >= env.RATE_LIMIT_FORGOT_PER_EMAIL_HOURLY) {
      return {
        message: "Jika email terdaftar, instruksi reset sudah dikirim.",
      };
    }

    user.forgot_request_count = count + 1;
    user.forgot_window_started_at = new Date();

    const otp = buatOtp();
    const resetToken = buatResetToken();

    user.otp_hash = hashSha256(otp);
    user.otp_expires_at = expiredDalamMenit(env.OTP_EXPIRES_MINUTES);
    user.reset_token_hash = hashSha256(resetToken);
    user.reset_token_expires_at = expiredDalamMenit(
      env.RESET_TOKEN_EXPIRES_MINUTES
    );
    await user.save();

    // WAJIB await: di Vercel serverless, function langsung mati setelah
    // response dikirim — promise fire-and-forget tidak akan pernah selesai.
    // Dibungkus try/catch supaya kegagalan SMTP tidak mengubah response
    // (tetap 200 generik — anti user-enumeration).
    try {
      await kirimEmailResetPassword(user, otp, resetToken);
    } catch (err) {
      console.error(
        `[mail] gagal kirim email reset ke ${user.email}:`,
        err?.message ?? err
      );
    }
  }

  return { message: "Jika email terdaftar, instruksi reset sudah dikirim." };
};

/**
 * Verifikasi OTP. Bukan sekadar cek: OTP yang benar -> terbitkan token
 * reset BARU dan kembalikannya ke FE, supaya user yang membaca email di
 * HP tapi membuka aplikasi di perangkat lain tetap bisa menyelesaikan
 * reset tanpa menyalin link panjang.
 *
 * Konsekuensi yang disengaja:
 *   - OTP sekali pakai (hash-nya dihapus begitu berhasil).
 *   - Token di link email lama hangus (ditimpa hash baru) — setelah OTP
 *     dipakai, satu-satunya jalan reset adalah token baru dari respons ini.
 */
const verifikasiOtp = async ({ email, otp }) => {
  const user = await UserModel.findOne({ email }).select(
    "+otp_hash +otp_expires_at"
  );

  if (
    !user ||
    !user.otp_hash ||
    user.otp_hash !== hashSha256(otp) ||
    user.otp_expires_at < new Date()
  ) {
    // pesan seragam: tidak membocorkan apakah email terdaftar
    throw createHttpError(400, "Kode OTP salah atau kedaluwarsa");
  }

  const resetToken = buatResetToken();
  user.otp_hash = undefined;
  user.otp_expires_at = undefined;
  user.reset_token_hash = hashSha256(resetToken);
  user.reset_token_expires_at = expiredDalamMenit(
    env.RESET_TOKEN_EXPIRES_MINUTES
  );
  await user.save();

  return { verified: true, resetToken };
};

const resetPassword = async ({ token, newPassword }) => {
  const user = await UserModel.findOne({
    reset_token_hash: hashSha256(token),
    reset_token_expires_at: { $gt: new Date() },
  });

  if (!user) {
    throw createHttpError(400, "Token reset salah atau kedaluwarsa");
  }

  if (!user.isActive) {
    throw createHttpError(403, "Akun Anda tidak aktif, hubungi admin");
  }

  // pre-save hook model yang meng-hash password baru.
  user.password = newPassword;
  // single-use: keduanya hangus setelah dipakai. undefined (bukan null)
  // supaya field-nya benar-benar hilang dari dokumen — kalau dibiarkan
  // null, sparse unique index reset_token_hash bentrok dengan user lain
  // yang juga null.
  user.otp_hash = undefined;
  user.otp_expires_at = undefined;
  user.reset_token_hash = undefined;
  user.reset_token_expires_at = undefined;
  await user.save();

  return user;
};

export default { login, getProfile, editProfile, changePassword, lupaPassword, verifikasiOtp, resetPassword };
