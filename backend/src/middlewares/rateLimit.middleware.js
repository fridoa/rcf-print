import rateLimit from "express-rate-limit";
import createHttpError from "http-errors";
import { env, isAutotest } from "../config/env.js";

/**
 * Rate limiter endpoint AUTH PUBLIK.
 *
 * Dipasang hanya di route publik modul auth (login, forgot-password,
 * verify-otp, reset-password) — bukan global — karena:
 *   - endpoint internal sudah dilindungi token JWT + guard role,
 *   - limiter global hanya bikin UX admin/internal tersendat.
 *
 * express-rate-limit menyimpan hitungan per-IP di memori. Untuk aplikasi
 * single-instance seperti ini cukup; kalau nanti dipakai multi-instance,
 * ganti store-nya ke Redis.
 *
 * Di autotest semua limiter dilewati (passthrough) supaya test suite yang
 * menghantam endpoint berkali-kali tidak saling memblokir.
 */

const menitKeMs = (menit) => menit * 60 * 1000;

const pesan429 = (retryAfterDetik, konteks) =>
  `Terlalu banyak percobaan ${konteks}. Coba lagi dalam ${Math.ceil(
    retryAfterDetik / 60
  )} menit.`;

/** Passthrough untuk autotest: tidak pernah memblokir. */
const buatLimiter = (opsi) => {
  if (isAutotest) {
    return (req, res, next) => next();
  }
  return rateLimit({
    windowMs: menitKeMs(env.RATE_LIMIT_WINDOW_MINUTES),
    standardHeaders: "draft-7", // RateLimit-* headers standar + Retry-After
    legacyHeaders: false,
    ...opsi,
  });
};

/**
 * Login: melindungi dari brute-force password.
 * Longgar — user memang sering salah ketik.
 */
export const loginLimiter = buatLimiter({
  limit: env.RATE_LIMIT_LOGIN_MAX,
  message: {
    success: false,
    message: `Terlalu banyak percobaan login. Coba lagi dalam ${env.RATE_LIMIT_WINDOW_MINUTES} menit.`,
  },
});

/**
 * Forgot-password: PALING ketat — tiap hit yang lolos = satu email SMTP
 * terkirim (biaya nyata + bisa membombardir inbox korban).
 */
export const forgotPasswordLimiter = buatLimiter({
  limit: env.RATE_LIMIT_FORGOT_MAX,
  message: {
    success: false,
    message: `Terlalu banyak permintaan reset password. Coba lagi dalam ${env.RATE_LIMIT_WINDOW_MINUTES} menit.`,
  },
});

/**
 * Verify-otp & reset-password: sedang. Dijalankan setelah user membuka
 * email, jadi hit-nya sedikit; batas ini cukup untuk OTP salah-ketik
 * berkali-kali tanpa memberi ruang brute-force 6 digit.
 */
export const otpLimiter = buatLimiter({
  limit: env.RATE_LIMIT_OTP_MAX,
  message: {
    success: false,
    message: `Terlalu banyak percobaan. Coba lagi dalam ${env.RATE_LIMIT_WINDOW_MINUTES} menit.`,
  },
});
