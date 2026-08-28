/**
 * Normalisasi nomor WhatsApp ke format 62xxxxxxxxxx.
 *
 * Alasan dinormalisasi di satu tempat: nomor yang sama sering ditulis
 * berbeda-beda oleh admin ("0812-3456-7890", "+62 812 3456 7890",
 * "62812 3456 7890"). Kalau disimpan apa adanya, pelanggan yang sama
 * bisa masuk dua kali dan unique index jadi tidak ada gunanya.
 *
 * Format 62 dipilih karena dipakai langsung untuk link wa.me saat
 * status order READY (admin mengabari konsumen).
 */

/** Pola nomor yang dianggap sah setelah dinormalisasi. */
export const WHATSAPP_PATTERN = /^62\d{8,13}$/;

/**
 * Kembalikan nomor dalam format 62xxxxxxxxxx.
 * Input yang tidak bisa dinormalisasi dikembalikan apa adanya (tanpa
 * karakter non-digit) supaya validator yang memutuskan penolakannya —
 * fungsi ini tidak melempar error.
 */
export const normalizeWhatsapp = (raw) => {
  const digits = String(raw ?? "").replace(/\D/g, "");

  if (!digits) return "";

  // 620812... → 62812...  (tercampur saat orang menulis +62 lalu 0)
  if (digits.startsWith("620")) {
    return `62${digits.slice(3)}`;
  }

  // 0812... → 62812...
  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  // 812... → 62812...
  if (digits.startsWith("8")) {
    return `62${digits}`;
  }

  return digits;
};

/** Format untuk ditampilkan/dipakai sebagai link: https://wa.me/62812... */
export const toWhatsappLink = (nomor) => `https://wa.me/${nomor}`;
