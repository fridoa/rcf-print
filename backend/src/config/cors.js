import createHttpError from "http-errors";
import { env, isProduction, isStaging } from "./env.js";

/**
 * Daftar origin yang boleh memanggil API.
 *
 * FRONTEND_URL selalu masuk karena itu alamat FE yang sama dipakai untuk
 * link reset password — kalau FE bisa mengirim email atas nama kita,
 * dia memang origin yang sah. CORS_ORIGINS untuk sisanya (preview deploy,
 * domain www, staging) dipisah koma.
 *
 * Dinormalisasi tanpa trailing slash karena browser mengirim header Origin
 * tanpa slash ("https://a.com", bukan "https://a.com/"). Satu slash nyasar
 * di .env cukup untuk membuat FE ditolak dengan pesan yang membingungkan.
 */
const normalize = (value) => value.trim().replace(/\/+$/, "");

export const allowedOrigins = [env.FRONTEND_URL, ...env.CORS_ORIGINS]
  .filter(Boolean)
  .map(normalize)
  // Set membuang duplikat kalau FRONTEND_URL juga ditulis di CORS_ORIGINS.
  .filter((origin, index, list) => list.indexOf(origin) === index);

/**
 * Di development dan autotest, localhost port berapa pun diizinkan.
 *
 * Alasannya praktis: Vite pindah ke 5174 kalau 5173 dipakai, dan tim bisa
 * memakai port lain. Kalau ini juga berlaku di production, seluruh gunanya
 * whitelist hilang — penyerang cukup menjalankan halaman di localhost.
 * Karena itu dijaga oleh flag environment, bukan oleh pola regex saja.
 */
const izinkanLocalhost = !isProduction && !isStaging;

const LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export const isOriginAllowed = (origin) => {
  // Origin kosong artinya request bukan dari browser lintas-origin:
  // curl, Postman, health check, server-to-server, atau same-origin.
  // CORS tidak relevan di situ — yang menjaganya autentikasi, bukan ini.
  if (!origin) return true;

  const bersih = normalize(origin);

  if (allowedOrigins.includes(bersih)) return true;
  if (izinkanLocalhost && LOCALHOST.test(bersih)) return true;

  return false;
};

/**
 * Opsi untuk middleware cors().
 *
 * Origin yang ditolak dilempar sebagai 403 lewat http-errors, bukan
 * Error biasa. Kalau pakai Error biasa, errorHandler menganggapnya 500
 * dan mencatatnya sebagai kesalahan server — padahal ini penolakan
 * yang disengaja, dan log 500 palsu menyulitkan saat mencari masalah nyata.
 */
export const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    callback(
      createHttpError(403, `Origin "${origin}" tidak diizinkan mengakses API ini`)
    );
  },

  // Perlu true kalau nanti pindah dari localStorage ke cookie httpOnly.
  // Konsekuensinya: wildcard "*" tidak boleh dipakai — dan memang tidak.
  credentials: true,

  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "sentry-trace", "baggage"],

  // Cache hasil preflight 10 menit supaya tidak ada OPTIONS di depan
  // setiap request. Chrome membatasi maksimum 2 jam.
  maxAge: 600,
};
