/**
 * Template OTP polos (tanpa link) — dipakai bila nanti butuh OTP murni,
 * mis. verifikasi email. Saat ini lupa password memakai resetPasswordTemplate;
 * file ini disiapkan supaya import di mail.js tidak menggantung.
 */
export const otpPasswordTemplate = (user, otp, menitBerlaku = 10) => ({
  from: user?.email ?? "",
  to: user?.email ?? "",
  subject: `Kode OTP ${menitBerlaku} menit`,
  text: `Kode OTP Anda: ${otp}. Berlaku ${menitBerlaku} menit.`,
  html: `<p>Kode OTP Anda: <strong>${otp}</strong>. Berlaku ${menitBerlaku} menit.</p>`,
});
