import createHttpError from "http-errors";
import nodemailer from "nodemailer";
import { env, isAutotest } from "../../config/env.js";
import { resetPasswordTemplate } from "./templates/resetPassword.js";
import { otpPasswordTemplate } from "./templates/otpPassword.js";

/**
 * Adapter email SMTP.
 *
 * Seluruh modul auth bicara ke fungsi di file ini, TIDAK langsung ke
 * nodemailer. Sama seperti storage.js, tujuannya dua:
 *   1. Ganti vendor = ganti isi file ini saja (service tidak berubah).
 *   2. Di autotest, adapter memakai implementasi PALSU (in-memory) sehingga
 *      test tidak menyentuh jaringan SMTP dan tidak butuh kredensial.
 *
 * Kredensial SMTP sengaja opsional di config/env.js: server tetap boot tanpa
 * kredensial. Yang menegakkan kelengkapannya adalah `ensureSiap()` — jadi
 * lupa mengisi env hanya mematikan fitur lupa password (503), bukan API.
 *
 * Zoho Mail SMTP (provider yang dipilih user):
 *   host smtp.zoho.com, port 465 (TLS implisit, secure: true) atau
 *   port 587 (STARTTLS, secure: false). Pakai 465 biar satu setelan.
 */

/** True kalau user + password SMTP sudah terisi. */
export const mailSiap = () => Boolean(env.EMAIL_SMTP_USER && env.EMAIL_SMTP_PASS);

/**
 * Lempar 503 kalau SMTP belum dikonfigurasi. Dipanggil di service SEBELUM
 * membuat OTP/token supaya admin dapat pesan jelas, alih-alih error koneksi
 * yang membingungkan.
 */
const ensureSiap = () => {
  if (!mailSiap()) {
    throw createHttpError(
      503,
      "Fitur reset password belum aktif: kredensial SMTP belum diisi di server"
    );
  }
};

// Transport dibuat malas (lazy) dan di-cache — tidak saat import, supaya
// modul ini bisa di-import walau kredensial kosong (mis. di autotest).
let _transport = null;
const transport = () => {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: env.EMAIL_SMTP_HOST || "smtp.zoho.com",
      port: Number(env.EMAIL_SMTP_PORT) || 465,
      secure: (Number(env.EMAIL_SMTP_PORT) || 465) === 465, // 465 = TLS implisit
      auth: { user: env.EMAIL_SMTP_USER, pass: env.EMAIL_SMTP_PASS },
    });
  }
  return _transport;
};

/**
 * Implementasi PALSU untuk autotest: tidak ada jaringan. Email "terkirim"
 * dicatat ke array, bentuk return identik dengan nodemailer asli supaya
 * service tidak bisa membedakannya.
 */
const fakeMail = {
  kirim: [],
  sendMail: async (opsi) => {
    fakeMail.kirim.push(opsi);
    return { messageId: `fake_${Date.now()}`, accepted: [opsi.to] };
  },
};

/**
 * Kirim email reset password berisi OTP + link ber-token.
 *
 * @param {object} user  dokumen user (name, email)
 * @param {string} otp   OTP 6 digit (mentah — hanya ada di email ini)
 * @param {string} resetToken token reset (mentah — hanya ada di link email)
 */
export const kirimEmailResetPassword = async (user, otp, resetToken) => {
  if (isAutotest) return fakeMail.sendMail(resetPasswordTemplate(user, otp, resetToken));
  ensureSiap();
  return transport().sendMail(resetPasswordTemplate(user, otp, resetToken));
};

/** Ambil email yang "terkirim" di autotest (untuk inspeksi test). */
export const emailAutotest = () => fakeMail.kirim;

export { resetPasswordTemplate, otpPasswordTemplate };
