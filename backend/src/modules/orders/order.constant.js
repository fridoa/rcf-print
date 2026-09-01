/**
 * Konstanta domain order.
 *
 * Semua aturan alur (jenis, status, siapa boleh mengubah apa) dikumpulkan di
 * satu file supaya service, validator, dan test membaca sumber yang sama.
 * ERD Revisi v2 (Order Terpisah) adalah kontraknya.
 */

/** Jenis sablon. Menentukan prefix nomor DAN jalur status. */
export const JENIS = {
  DTF: "DTF",
  POLYFLEX: "POLYFLEX",
};

export const JENIS_LIST = Object.values(JENIS);

/** Prefix nomor order per jenis: DTF → "DTF", POLYFLEX → "PLF". */
export const PREFIX_JENIS = {
  [JENIS.DTF]: "DTF",
  [JENIS.POLYFLEX]: "PLF",
};

/** Metode pembayaran, dicatat saat serah terima (READY → SELESAI). */
export const METODE_BAYAR = {
  CASH: "CASH",
  TRANSFER: "TRANSFER",
};

export const METODE_BAYAR_LIST = Object.values(METODE_BAYAR);

/** Status order. Nilai sama untuk kedua jenis kecuali langkah produksi. */
export const STATUS = {
  ANTRI_DESAIN: "ANTRI_DESAIN",
  ANTRI_CETAK: "ANTRI_CETAK", // hanya DTF
  ANTRI_CUTTING: "ANTRI_CUTTING", // hanya POLYFLEX
  PACKING: "PACKING",
  READY: "READY",
  SELESAI: "SELESAI",
};

export const STATUS_LIST = Object.values(STATUS);

/**
 * Alur maju per jenis. Urutan array = urutan langkah; transisi normal hanya
 * boleh pindah ke elemen persis setelahnya. Perbedaan tunggal antara kedua
 * jalur adalah langkah produksi (ANTRI_CETAK untuk DTF, ANTRI_CUTTING untuk
 * POLYFLEX) — sisanya identik.
 */
export const ALUR = {
  [JENIS.DTF]: [
    STATUS.ANTRI_DESAIN,
    STATUS.ANTRI_CETAK,
    STATUS.PACKING,
    STATUS.READY,
    STATUS.SELESAI,
  ],
  [JENIS.POLYFLEX]: [
    STATUS.ANTRI_DESAIN,
    STATUS.ANTRI_CUTTING,
    STATUS.PACKING,
    STATUS.READY,
    STATUS.SELESAI,
  ],
};

/**
 * Role yang berhak melakukan tiap transisi maju, dikunci ke status ASAL.
 * ADMIN tidak dicantumkan di sini karena ADMIN punya kuasa lintas transisi
 * (menyelesaikan order dan koreksi mundur) yang ditangani terpisah di service.
 *
 * - DESIGNER  : ANTRI_DESAIN → langkah produksi (menandai desain selesai)
 * - PRODUKSI  : langkah produksi → PACKING (selesai cetak/cutting)
 * - PACKING   : PACKING → READY (selesai packing)
 *
 * READY → SELESAI sengaja TIDAK ada di sini: itu penyelesaian order (catat
 * pembayaran) yang hanya boleh ADMIN, lewat jalur khusus di service.
 */
export const TRANSISI_ROLE = {
  [STATUS.ANTRI_DESAIN]: "DESIGNER",
  [STATUS.ANTRI_CETAK]: "PRODUKSI",
  [STATUS.ANTRI_CUTTING]: "PRODUKSI",
  [STATUS.PACKING]: "PACKING",
};
