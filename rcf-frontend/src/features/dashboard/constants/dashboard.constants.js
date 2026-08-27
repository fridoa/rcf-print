import { STATUS, STATUS_LABEL } from "@/features/orders";

/**
 * Warna hex per status untuk chart SVG (DonutChart butuh nilai warna, bukan
 * kelas Tailwind). Selaras dengan STATUS_TONE di order.constants (versi kelas)
 * tapi dalam bentuk hex supaya bisa dipakai di atribut stroke/fill.
 */
export const STATUS_HEX = {
  [STATUS.ANTRI_DESAIN]: "#f59e0b", // amber-500
  [STATUS.ANTRI_CETAK]: "#0ea5e9", // sky-500
  [STATUS.ANTRI_CUTTING]: "#6366f1", // indigo-500
  [STATUS.PACKING]: "#8b5cf6", // violet-500
  [STATUS.READY]: "#10b981", // emerald-500
  [STATUS.SELESAI]: "#94a3b8", // slate-400
};

/** Versi kelas bg-* untuk BarList. */
export const STATUS_BAR = {
  [STATUS.ANTRI_DESAIN]: "bg-amber-500",
  [STATUS.ANTRI_CETAK]: "bg-sky-500",
  [STATUS.ANTRI_CUTTING]: "bg-indigo-500",
  [STATUS.PACKING]: "bg-violet-500",
  [STATUS.READY]: "bg-emerald-500",
  [STATUS.SELESAI]: "bg-slate-400",
};

/**
 * Susun data donut "order aktif per status" dari objek perStatus statistik.
 * SELESAI sengaja dikecualikan (donut fokus pekerjaan berjalan).
 */
export const donutAktif = (perStatus = {}) =>
  [
    STATUS.ANTRI_DESAIN,
    STATUS.ANTRI_CETAK,
    STATUS.ANTRI_CUTTING,
    STATUS.PACKING,
    STATUS.READY,
  ].map((s) => ({
    label: STATUS_LABEL[s] ?? s,
    value: perStatus[s]?.count ?? 0,
    color: STATUS_HEX[s],
  }));
