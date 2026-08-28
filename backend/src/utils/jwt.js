import jwt from "jsonwebtoken";
import createHttpError from "http-errors";
import { env } from "../config/env.js";

export const generateToken = (payload) => {
  if (!env.JWT_SECRET_KEY) {
    throw new Error("JWT_SECRET_KEY belum diisi di .env");
  }
  return jwt.sign(payload, env.JWT_SECRET_KEY, { expiresIn: env.JWT_EXPIRES_IN });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET_KEY);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw createHttpError(401, "Sesi Anda sudah berakhir, silakan login kembali");
    }
    throw createHttpError(401, "Token tidak valid");
  }
};
