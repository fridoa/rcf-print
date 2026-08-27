import createHttpError from "http-errors";
import UserModel from "../auth/user.model.js";
import { ROLES } from "../auth/auth.constant.js";

/**
 * Layanan manajemen user (khusus ADMIN).
 *
 * Tiga aturan aman yang dijaga di sini, bukan di controller, supaya tidak
 * bisa dilewati lewat jalur lain:
 *
 * 1. Admin tidak boleh menonaktifkan / menghapus / menurunkan role dirinya
 *    sendiri. Kalau boleh, seorang admin bisa tanpa sengaja mengunci
 *    dirinya keluar di tengah sesi.
 * 2. Sistem tidak boleh kehilangan admin aktif TERAKHIR. Tanpa admin aktif,
 *    tidak ada yang bisa mengelola user lagi — hanya bisa dipulihkan lewat
 *    seed script langsung ke database.
 * 3. Password polos tidak pernah lewat sini kecuali di jalur create dan
 *    resetPassword; hashing tetap urusan pre-save hook di model.
 */

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Ambil user atau lempar 404. Dipakai ulang oleh update/reset/remove. */
const getById = async (id) => {
  const user = await UserModel.findById(id);
  if (!user) {
    throw createHttpError(404, "User tidak ditemukan");
  }
  return user;
};

/**
 * Jumlah admin yang masih aktif SELAIN user tertentu.
 *
 * Dipakai untuk menjawab satu pertanyaan: kalau user ini dinonaktifkan /
 * dihapus / diturunkan rolenya, apakah masih ada admin aktif yang tersisa?
 */
const adminAktifLain = (kecualiId) =>
  UserModel.countDocuments({
    _id: { $ne: kecualiId },
    role: ROLES.ADMIN,
    isActive: true,
  });

const list = async ({ search, role, isActive, page, limit, sort }) => {
  const filter = {};

  if (search) {
    const pola = escapeRegex(search);
    filter.$or = [
      { name: { $regex: pola, $options: "i" } },
      { username: { $regex: pola, $options: "i" } },
      { email: { $regex: pola, $options: "i" } },
    ];
  }

  if (role !== undefined) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive;

  const skip = (page - 1) * limit;

  // password sudah select:false di schema, jadi tidak ikut terbawa di sini
  const [items, total] = await Promise.all([
    UserModel.find(filter).sort(sort).skip(skip).limit(limit),
    UserModel.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const getOne = (id) => getById(id);

/**
 * Buat user baru. username & email dicek manual dulu supaya pesannya jelas
 * (mana yang bentrok); unique index tetap jadi pengaman terakhir untuk dua
 * request bersamaan (error 11000 → 409 di error handler global).
 */
const create = async ({ name, username, email, password, role, isActive }) => {
  const bentrok = await UserModel.findOne({
    $or: [{ username }, { email }],
  });

  if (bentrok) {
    const field = bentrok.username === username ? "Username" : "Email";
    throw createHttpError(409, `${field} sudah dipakai user lain`);
  }

  // isActive dibiarkan undefined kalau tidak dikirim supaya default model
  // (true) yang berlaku, bukan dipaksa di sini.
  const user = await UserModel.create({
    name,
    username,
    email,
    password,
    role,
    ...(isActive !== undefined ? { isActive } : {}),
  });

  return user;
};

/**
 * Update user oleh admin.
 *
 * actorId = id admin yang sedang melakukan aksi (dari token). Diperlukan
 * untuk membedakan "mengubah diri sendiri" dari "mengubah user lain".
 */
const update = async (id, actorId, { name, username, email, role, isActive }) => {
  const user = await getById(id);
  const mengubahDiriSendiri = String(user._id) === String(actorId);

  if (username !== undefined && username !== user.username) {
    const dipakai = await UserModel.exists({ username, _id: { $ne: id } });
    if (dipakai) throw createHttpError(409, "Username sudah dipakai user lain");
    user.username = username;
  }

  if (email !== undefined && email !== user.email) {
    const dipakai = await UserModel.exists({ email, _id: { $ne: id } });
    if (dipakai) throw createHttpError(409, "Email sudah dipakai user lain");
    user.email = email;
  }

  if (name !== undefined) user.name = name;

  // --- Perubahan yang bisa mengunci sistem: role & isActive ---

  if (role !== undefined && role !== user.role) {
    if (mengubahDiriSendiri) {
      throw createHttpError(403, "Anda tidak bisa mengubah role sendiri");
    }
    // Menurunkan admin terakhir dari ADMIN = menghilangkan admin aktif.
    if (
      user.role === ROLES.ADMIN &&
      user.isActive &&
      (await adminAktifLain(user._id)) === 0
    ) {
      throw createHttpError(
        409,
        "Tidak bisa mengubah role: ini admin aktif terakhir"
      );
    }
    user.role = role;
  }

  if (isActive !== undefined && isActive !== user.isActive) {
    if (mengubahDiriSendiri && isActive === false) {
      throw createHttpError(403, "Anda tidak bisa menonaktifkan akun sendiri");
    }
    // Menonaktifkan admin aktif terakhir.
    if (
      isActive === false &&
      user.role === ROLES.ADMIN &&
      (await adminAktifLain(user._id)) === 0
    ) {
      throw createHttpError(
        409,
        "Tidak bisa menonaktifkan admin aktif terakhir"
      );
    }
    user.isActive = isActive;
  }

  await user.save();
  return user;
};

/** Reset password user oleh admin (tanpa perlu password lama). */
const resetPassword = async (id, newPassword) => {
  const user = await getById(id);
  // pre-save hook yang meng-hash; assign polos lalu save.
  user.password = newPassword;
  await user.save();
  return user;
};

/**
 * Hapus user.
 *
 * Dilarang menghapus diri sendiri dan admin aktif terakhir dengan alasan
 * yang sama seperti di update. Ini hard delete; kalau nanti user sudah
 * pernah membuat/menangani order, pertimbangkan soft delete (isActive:false)
 * supaya riwayat order tidak menunjuk user yang hilang — sama seperti
 * catatan di modul customer.
 */
const remove = async (id, actorId) => {
  const user = await getById(id);

  if (String(user._id) === String(actorId)) {
    throw createHttpError(403, "Anda tidak bisa menghapus akun sendiri");
  }

  if (
    user.role === ROLES.ADMIN &&
    user.isActive &&
    (await adminAktifLain(user._id)) === 0
  ) {
    throw createHttpError(409, "Tidak bisa menghapus admin aktif terakhir");
  }

  await user.deleteOne();
  return user;
};

export default { list, getOne, create, update, resetPassword, remove };
