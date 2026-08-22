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
