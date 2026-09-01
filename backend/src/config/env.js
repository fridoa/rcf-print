import dotenv from "dotenv";

dotenv.config();

const required = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} wajib diisi. Lihat .env.example`);
  }
  return value;
};

const APP_ENVS = ["development", "autotest", "test", "staging", "production"];

const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || "development";

if (!APP_ENVS.includes(APP_ENV)) {
  throw new Error(`APP_ENV "${APP_ENV}" tidak dikenal. Pilih salah satu: ${APP_ENVS.join(", ")}`);
}

const DATABASE_URL = required("DATABASE_URL");

/**
 * Pagar pengaman: pastikan URL database cocok dengan environment yang aktif.
 *
 * Tujuannya mencegah kecelakaan paling mahal — deploy staging/production
 * yang ternyata masih menunjuk database development, atau test suite
 * (yang menghapus seluruh collection) berjalan di atas database dev/QA.
 *
 * autotest = database khusus `npm test`, isinya dihapus tiap test.
 * test     = database QA, diisi manual, JANGAN dipakai test otomatis.
 */
const DB_NAME_SUFFIX = {
  development: "_dev",
  autotest: "_autotest",
  test: "_test",
  staging: "_staging",
  production: "", // tanpa suffix, mis. rcf_print
};

const getDatabaseName = (url) => {
  // ambil segmen setelah host, sebelum query string
  const match = url.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const dbName = getDatabaseName(DATABASE_URL);

if (!dbName) {
  throw new Error(
    "DATABASE_URL tidak menyebut nama database. " +
      "Tambahkan nama database sebelum tanda '?', " +
      "contoh: mongodb+srv://user:pass@host/rcf_print_dev?retryWrites=true"
  );
}

const expectedSuffix = DB_NAME_SUFFIX[APP_ENV];

if (APP_ENV === "production") {
  const salah = ["_dev", "_autotest", "_test", "_staging"].find((s) => dbName.endsWith(s));
  if (salah) {
    throw new Error(
      `APP_ENV=production tapi database bernama "${dbName}" (berakhiran ${salah}). ` +
        "Periksa DATABASE_URL — jangan jalankan production di database non-production."
    );
  }
} else if (!dbName.endsWith(expectedSuffix)) {
  throw new Error(
    `APP_ENV=${APP_ENV} mengharapkan nama database berakhiran "${expectedSuffix}", ` +
      `tapi DATABASE_URL menunjuk ke "${dbName}". Periksa DATABASE_URL.`
  );
}

export const env = {
  APP_ENV,
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 3000,

  DATABASE_URL,
  DATABASE_NAME: dbName,

  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY || "",
  SENTRY_DSN: process.env.SENTRY_DSN || "",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1d",

  EMAIL_SMTP_SERVICE_NAME: process.env.EMAIL_SMTP_SERVICE_NAME || "",
  // Host/port untuk provider non-preset (Zoho). Kalau SERVICE_NAME diisi,
  // nodemailer memakai preset-nya dan host/port diabaikan — jangan set dua-duanya.
  EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST || "smtp.zoho.com",
  EMAIL_SMTP_PORT: Number(process.env.EMAIL_SMTP_PORT) || 465,
  EMAIL_SMTP_USER: process.env.EMAIL_SMTP_USER || "",
  EMAIL_SMTP_PASS: process.env.EMAIL_SMTP_PASS || "",
  EMAIL_SMTP_FROM_NAME: process.env.EMAIL_SMTP_FROM_NAME || "RCF Print",

  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",

  /**
   * Origin tambahan yang boleh memanggil API, dipisah koma.
   * FRONTEND_URL sudah otomatis diizinkan — ini untuk sisanya
   * (domain www, preview deploy, staging).
   */
  CORS_ORIGINS: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  OTP_EXPIRES_MINUTES: Number(process.env.OTP_EXPIRES_MINUTES) || 10,
  RESET_TOKEN_EXPIRES_MINUTES: Number(process.env.RESET_TOKEN_EXPIRES_MINUTES) || 60,

  /**
   * === Rate limiting endpoint auth publik ===
   *
   * Limiter per-IP (express-rate-limit), dipasang HANYA di route auth
   * publik (login, forgot-password, verify-otp, reset-password) — bukan
   * global, karena endpoint internal sudah dilindungi token + role dan
   * limiter global hanya bikin UX admin tersendat.
   *
   * Di-skip total di autotest supaya test suite tidak saling memblokir.
   */
  RATE_LIMIT_WINDOW_MINUTES: Number(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15,
  RATE_LIMIT_LOGIN_MAX: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 20,
  RATE_LIMIT_FORGOT_MAX: Number(process.env.RATE_LIMIT_FORGOT_MAX) || 3,
  RATE_LIMIT_OTP_MAX: Number(process.env.RATE_LIMIT_OTP_MAX) || 10,
  /** Batas permintaan forgot-password per EMAIL (bukan per IP) per jam. */
  RATE_LIMIT_FORGOT_PER_EMAIL_HOURLY: Number(
    process.env.RATE_LIMIT_FORGOT_PER_EMAIL_HOURLY
  ) || 3,
};

export const isProduction = APP_ENV === "production";
export const isStaging = APP_ENV === "staging";
export const isAutotest = APP_ENV === "autotest";
export const isTest = APP_ENV === "test";
export const isDevelopment = APP_ENV === "development";
