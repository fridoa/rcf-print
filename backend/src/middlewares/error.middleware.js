import createHttpError from "http-errors";
import { isProduction } from "../config/env.js";

/** Route tidak ditemukan → lempar 404 ke error handler */
export const notFoundHandler = (req, res, next) => {
  next(createHttpError(404, `Route ${req.method} ${req.originalUrl} tidak ditemukan`));
};

/** Error handler global. Harus dipasang paling akhir di index.js */
export const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message || "Terjadi kesalahan pada server";
  let errors;

  // Validasi Yup
  if (err.name === "ValidationError" && Array.isArray(err.errors)) {
    status = 400;
    message = "Data yang dikirim tidak valid";
    errors = err.errors;
  }

  // Duplikat unique index MongoDB
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || "data";
    message = `${field} sudah digunakan`;
  }

  // ObjectId tidak valid
  if (err.name === "CastError") {
    status = 400;
    message = `Nilai ${err.path} tidak valid`;
  }

  if (status >= 500) {
    console.error("[error]", err);
  }

  res.status(status).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    ...(isProduction ? {} : { stack: err.stack }),
  });
};
