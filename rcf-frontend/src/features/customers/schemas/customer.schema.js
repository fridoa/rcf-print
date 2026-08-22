import * as yup from "yup";

/**
 * Mirror dari backend/src/modules/customers/customer.validator.js.
 * Validasi di sini hanya untuk UX; server tetap validasi ulang.
 *
 * Nomor WA sengaja TIDAK dinormalisasi di FE. Yang dikirim adalah apa yang
 * diketik admin ("0812-3456-7890"), dan backend yang mengubahnya ke
 * 62xxxxxxxxxx lalu mengembalikan bentuk finalnya. Satu tempat normalisasi
 * = tidak ada kemungkinan FE dan BE beda hasil.
 */

/** Terima 08xx / 62xx / +62xx dengan spasi, titik, atau tanda hubung. */
const POLA_WA = /^(\+?62|0)[\s.-]?8[\d\s.-]{7,13}$/;

export const customerSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required("Nama pelanggan wajib diisi")
    .min(3, "Nama pelanggan minimal 3 karakter")
    .max(80, "Nama pelanggan maksimal 80 karakter"),
  whatsapp: yup
    .string()
    .trim()
    .required("Nomor WhatsApp wajib diisi")
    .matches(POLA_WA, "Nomor WhatsApp tidak valid. Contoh: 081234567890"),
  note: yup.string().trim().max(200, "Catatan maksimal 200 karakter"),
});
