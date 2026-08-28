import multer from "multer";
import createHttpError from "http-errors";
import { env } from "../config/env.js";

/**
 * Middleware upload file desain.
 *
 * memoryStorage: file ditahan di RAM sebagai Buffer, lalu di-stream ke ImageKit
 * oleh adapter storage — kita tidak menulis file ke disk server (cocok untuk
 * lingkungan serverless/kontainer yang filesystem-nya sementara).
 *
 * Batas ukuran diambil dari env (DESIGN_MAX_FILE_BYTES, default 10 MB) supaya
 * bisa disetel tanpa ubah kode.
 *
 * Hanya menerima gambar (image/*): file desain sablon berupa PNG/JPG. Jenis
 * lain (PDF/zip/dll) ditolak lebih awal di sini.
 */
const ALLOWED_MIME = /^image\/(png|jpe?g|webp|svg\+xml)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.DESIGN_MAX_FILE_BYTES,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.test(file.mimetype)) {
      // createHttpError → error handler global mengembalikan 400 rapi.
      return cb(
        createHttpError(
          400,
          "Tipe file tidak didukung. Unggah gambar PNG, JPG, WEBP, atau SVG."
        )
      );
    }
    cb(null, true);
  },
});

/**
 * Terima tepat satu file di field "file".
 *
 * Dibungkus supaya MulterError (mis. LIMIT_FILE_SIZE) diterjemahkan ke 400
 * berpesan jelas, bukan 500. Field selain "file" (LIMIT_UNEXPECTED_FILE) juga
 * dipandu ke pesan yang benar.
 */
export const uploadDesainFile = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        const mb = Math.round(env.DESIGN_MAX_FILE_BYTES / (1024 * 1024));
        return next(
          createHttpError(400, `Ukuran file melebihi batas ${mb} MB`)
        );
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return next(
          createHttpError(400, 'Kirim file pada field bernama "file"')
        );
      }
      return next(createHttpError(400, err.message));
    }

    return next(err);
  });
};
