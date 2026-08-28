import { env } from "../../../config/env.js";

/**
 * Template email reset password.
 *
 * Sengaja HTML sederhana tanpa library templating: satu email, tabel inline
 * (klien email tidak memuat <style>). OTP ditampilkan besar untuk yang baca
 * di HP, link ber-token untuk yang baca di desktop.
 */
export const resetPasswordTemplate = (user, otp, resetToken) => {
  const url = `${env.FRONTEND_URL}/lupa-katasandi?token=${resetToken}`;
  const menit = env.OTP_EXPIRES_MINUTES;

  return {
    from: `"${env.EMAIL_SMTP_FROM_NAME}" <${env.EMAIL_SMTP_USER}>`,
    to: user.email,
    subject: `${otp} — Kode Reset Password ${env.EMAIL_SMTP_FROM_NAME}`,
    html: `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
  <h2 style="margin:0 0 16px">Reset Password</h2>
  <p>Halo <strong>${user.name}</strong>,</p>
  <p>Kami menerima permintaan reset password untuk akun <strong>${user.username}</strong>.
     Masukkan kode berikut di halaman reset password:</p>
  <div style="font-size:32px;letter-spacing:8px;font-weight:bold;text-align:center;
              background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0">${otp}</div>
  <p style="text-align:center">atau klik tombol di bawah (keduanya berlaku ${menit} menit):</p>
  <p style="text-align:center;margin:24px 0">
    <a href="${url}"
       style="background:#0f172a;color:#fff;text-decoration:none;padding:12px 24px;
              border-radius:8px;display:inline-block">Buka Halaman Reset Password</a>
  </p>
  <p style="font-size:12px;color:#64748b">
    Abaikan email ini kalau Anda tidak meminta reset password — password Anda tidak berubah.
    Kode ini hanya bisa dipakai sekali.
  </p>
</div>`,
  };
};
