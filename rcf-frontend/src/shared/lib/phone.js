/**
 * Tampilkan nomor 62xxxxxxxxxx sebagai 0812-3456-7890.
 *
 * Yang disimpan backend selalu format 62 (dipakai link wa.me), tapi
 * admin di depan pelanggan membaca dan menyebutkan nomor dalam format 0.
 */
export const formatWhatsapp = (nomor) => {
  const digits = String(nomor ?? "").replace(/\D/g, "");
  if (!digits) return "-";

  const lokal = digits.startsWith("62") ? `0${digits.slice(2)}` : digits;

  // 0812 3456 7890 → potong 4-4-sisa
  return lokal.replace(/^(\d{4})(\d{4})(\d+)$/, "$1-$2-$3");
};

/** Link chat WhatsApp; nomor sudah format 62 dari backend. */
export const whatsappLink = (nomor) =>
  `https://wa.me/${String(nomor ?? "").replace(/\D/g, "")}`;

/**
 * Pola nomor sah setelah dinormalisasi — mirror backend/src/utils/phone.js.
 * Dipakai validasi FE saat admin mengetik nomor pelanggan baru di form order.
 */
export const WHATSAPP_PATTERN = /^62\d{8,13}$/;

/**
 * Normalisasi ke format 62xxxxxxxxxx — mirror backend normalizeWhatsapp.
 *
 * Ada di FE hanya untuk validasi & pratinjau (mencocokkan bentuk sebelum
 * kirim). Sumber kebenaran tetap backend: schema Customer menormalkan ulang
 * saat menyimpan, jadi FE tidak wajib sempurna, cukup konsisten.
 */
export const normalizeWhatsapp = (raw) => {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("620")) return `62${digits.slice(3)}`;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
};
