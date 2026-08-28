import crypto from "crypto";

/**
 * Util OTP & token reset password.
 *
 * Prinsip: yang disimpan di database HANYAH hash — nilai mentah ada di
 * tangan user (email) / response API sekali saja. Kalau database bocor,
 * hash tidak bisa dipakai login atau reset.
 */

/** OTP 6 digit, 000000-999999, selalu 6 karakter (pad depan nol). */
export const buatOtp = () => String(crypto.randomInt(1000000)).padStart(6, "0");

/** Token reset 64 karakter hex (32 byte entropi — tidak bisa ditebak). */
export const buatResetToken = () => crypto.randomBytes(32).toString("hex");

/** Hash sha256 hex — dipakai untuk OTP maupun token reset. */
export const hashSha256 = (nilai) =>
  crypto.createHash("sha256").update(String(nilai)).digest("hex");

/** Tanggal kedaluwarsa dari sekarang + N menit. */
export const expiredDalamMenit = (menit) =>
  new Date(Date.now() + menit * 60 * 1000);
