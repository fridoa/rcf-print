/**
 * Format angka rupiah untuk tampilan: 3512000 → "Rp 3.512.000".
 * Mockup menampilkan nilai dengan pemisah ribuan, bukan angka mentah.
 * Nilai null/undefined (order belum dibayar) tampil sebagai "-".
 */
export const formatRupiah = (nilai) => {
  if (nilai === null || nilai === undefined || nilai === "") return "-";
  const angka = Number(nilai);
  if (Number.isNaN(angka)) return "-";
  return `Rp ${angka.toLocaleString("id-ID")}`;
};

/**
 * Format tanggal singkat WIB: "22 Agu 2026". Untuk kolom tanggal order &
 * deadline di tabel. Menerima Date atau string ISO.
 */
export const formatTanggal = (nilai) => {
  if (!nilai) return "-";
  const d = new Date(nilai);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
};

/** Tanggal + jam WIB: "22 Agu 2026, 14:30". Untuk timeline/riwayat. */
export const formatTanggalJam = (nilai) => {
  if (!nilai) return "-";
  const d = new Date(nilai);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
};

/**
 * Ambil digit murni dari input harga yang mungkin sudah diformat.
 * "Rp 1.500.000" / "1.500.000" / "1500000" → "1500000". Non-digit dibuang
 * semua (termasuk titik pemisah), jadi aman dipakai saat user mengetik.
 */
export const digitOnly = (nilai) =>
  nilai === null || nilai === undefined ? "" : String(nilai).replace(/\D/g, "");

/**
 * Format digit dengan pemisah ribuan gaya id-ID untuk DITAMPILKAN di input:
 * "1500000" → "1.500.000", "" → "". Tanpa prefix "Rp" (prefix dirender
 * terpisah oleh CurrencyField supaya kursor tidak melompat).
 */
export const formatRibuan = (nilai) => {
  const digits = digitOnly(nilai);
  if (digits === "") return "";
  return Number(digits).toLocaleString("id-ID");
};
