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

export default { login, getProfile };
