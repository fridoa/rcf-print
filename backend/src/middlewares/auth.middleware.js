import createHttpError from "http-errors";
import { verifyToken } from "../utils/jwt.js";

/** Pastikan request membawa bearer token yang valid. */
export const authenticate = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      throw createHttpError(401, "Token tidak ditemukan");
    }

    const token = header.slice(7).trim();
    if (!token) {
      throw createHttpError(401, "Token tidak ditemukan");
    }

    const payload = verifyToken(token);
    req.user = { id: payload.id, role: payload.role };

    next();
  } catch (error) {
    next(error);
  }
};
