/**
 * Helper tanggal untuk penomoran & rekap harian.
 *
 * Batas hari memakai zona Asia/Jakarta (UTC+7), bukan UTC. Kalau tidak, order
 * yang masuk sore hari (mis. 22:00 WIB = 15:00 UTC) masih aman, tapi order
 * yang masuk lewat tengah malam WIB tapi sebelum tengah malam UTC bisa
 * terhitung di tanggal yang salah — dan nomor urut harian ikut kacau.
 *
 * Pendekatannya: kita tidak memakai library zona waktu (tetap tanpa dependensi
 * baru). Offset WIB tetap +7 jam sepanjang tahun (Indonesia tidak punya DST),
 * jadi cukup menggeser waktu UTC sebesar +7 jam lalu membaca komponennya dalam
 * UTC. Hasilnya adalah komponen tanggal/jam "seolah-olah" di Jakarta.
 */

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Komponen tanggal (year, month 1-12, day) menurut kalender Jakarta.
 * @param {Date} [date]
 */
export const komponenTanggalJakarta = (date = new Date()) => {
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  return {
    year: wib.getUTCFullYear(),
    month: wib.getUTCMonth() + 1,
    day: wib.getUTCDate(),
  };
};

/**
 * Format DDMMYY menurut tanggal Jakarta. Dipakai sebagai bagian nomor order
 * dan kunci counter harian. Contoh: 22 Agustus 2026 → "220826".
 * @param {Date} [date]
 */
export const formatDDMMYY = (date = new Date()) => {
  const { year, month, day } = komponenTanggalJakarta(date);
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const yy = String(year % 100).padStart(2, "0");
  return `${dd}${mm}${yy}`;
};

/**
 * Awal hari (00:00:00.000 WIB) untuk tanggal yang memuat `date`, dikembalikan
 * sebagai Date UTC. Dipakai untuk menyimpan `tgl_order` yang konsisten dan
 * untuk filter rentang rekap ("orders pada hari X di Jakarta").
 * @param {Date} [date]
 */
export const awalHariJakarta = (date = new Date()) => {
  const { year, month, day } = komponenTanggalJakarta(date);
  // Tengah malam WIB = 17:00 UTC hari sebelumnya. Bentuk lewat epoch supaya
  // tidak terpengaruh zona waktu mesin yang menjalankan.
  const midnightUtcMs = Date.UTC(year, month - 1, day) - WIB_OFFSET_MS;
  return new Date(midnightUtcMs);
};

/**
 * Awal hari BERIKUTNYA (batas atas eksklusif) untuk filter rentang.
 * @param {Date} [date]
 */
export const awalHariBerikutnyaJakarta = (date = new Date()) => {
  const awal = awalHariJakarta(date);
  return new Date(awal.getTime() + 24 * 60 * 60 * 1000);
};

/**
 * Awal bulan (tanggal 1, 00:00 WIB) yang memuat `date`, sebagai Date UTC.
 * Dipakai sebagai default rentang rekap ("bulan berjalan").
 * @param {Date} [date]
 */
export const awalBulanJakarta = (date = new Date()) => {
  const { year, month } = komponenTanggalJakarta(date);
  const midnightUtcMs = Date.UTC(year, month - 1, 1) - WIB_OFFSET_MS;
  return new Date(midnightUtcMs);
};

/** Zona waktu operasional — dipakai operator tanggal MongoDB pada rekap. */
export const TZ_JAKARTA = "Asia/Jakarta";
