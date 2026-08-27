/**
 * Konstanta domain order untuk FE — mirror dari
 * backend/src/modules/orders/order.constant.js.
 *
 * Dipakai untuk label tampilan, opsi dropdown, dan konfigurasi tiap layar
 * kerja per-role (Opsi B). Nilai enum harus persis sama dengan backend.
 */

export const JENIS = {
  DTF: "DTF",
  POLYFLEX: "POLYFLEX",
};

export const JENIS_LIST = Object.values(JENIS);

export const JENIS_LABEL = {
  DTF: "DTF",
  POLYFLEX: "Polyflex",
};

export const METODE_BAYAR = {
  CASH: "CASH",
  TRANSFER: "TRANSFER",
};

export const METODE_BAYAR_LIST = Object.values(METODE_BAYAR);

export const METODE_BAYAR_LABEL = {
  CASH: "Cash",
  TRANSFER: "Transfer",
};

export const STATUS = {
  ANTRI_DESAIN: "ANTRI_DESAIN",
  ANTRI_CETAK: "ANTRI_CETAK",
  ANTRI_CUTTING: "ANTRI_CUTTING",
  PACKING: "PACKING",
  READY: "READY",
  SELESAI: "SELESAI",
};

export const STATUS_LIST = Object.values(STATUS);

/**
 * Alur status per jenis — mirror backend order.constant.js ALUR.
 * Dipakai form Koreksi untuk hanya menawarkan status yang sah bagi jenis
 * order itu (DTF pakai ANTRI_CETAK, Polyflex pakai ANTRI_CUTTING). Backend
 * menolak status di luar daftar ini, jadi FE menyaringnya lebih dulu.
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

/** Label ramah untuk badge & filter. */
export const STATUS_LABEL = {
  ANTRI_DESAIN: "Antri Desain",
  ANTRI_CETAK: "Antri Cetak",
  ANTRI_CUTTING: "Antri Cutting",
  PACKING: "Packing",
  READY: "Siap Diambil",
  SELESAI: "Selesai",
};

/**
 * Warna badge per status (kelas Tailwind). Dipisah dari label supaya
 * StatusBadge tinggal memetakan tanpa switch panjang.
 */
export const STATUS_TONE = {
  ANTRI_DESAIN: "bg-amber-100 text-amber-800",
  ANTRI_CETAK: "bg-sky-100 text-sky-800",
  ANTRI_CUTTING: "bg-sky-100 text-sky-800",
  PACKING: "bg-violet-100 text-violet-800",
  READY: "bg-emerald-100 text-emerald-800",
  SELESAI: "bg-slate-200 text-slate-600",
};
