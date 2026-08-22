import createHttpError from "http-errors";
import UserModel from "./user.model.js";
import { generateToken } from "../../utils/jwt.js";

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

export default { login, getProfile, editProfile, changePassword };
