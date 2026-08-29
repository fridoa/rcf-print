import * as Yup from "yup";
import {
  JENIS_LIST,
  STATUS_LIST,
  METODE_BAYAR_LIST,
} from "./order.constant.js";
import { WHATSAPP_PATTERN } from "../../utils/phone.js";
import { normalizeWhatsapp } from "../../utils/phone.js";

/** Transform "" → undefined untuk field angka opsional dari query/body. */
const kosongJadiUndefined = (v, original) =>
  original === "" ? undefined : v;

/**
 * POST /orders — buat order.
 *
 * Dua bentuk pelanggan didukung (find-or-create by nomor):
 *   1. customer_id — pelanggan lama yang sudah dipilih dari daftar.
 *   2. customer: { whatsapp, name?, note? } — input satu langkah. Nomor
 *      jadi kunci: kalau sudah terdaftar dipakai yang lama, kalau belum
 *      dibuat baru (name wajib untuk nomor baru).
 *
 * Tepat SATU dari keduanya wajib ada. Ini mencegah dobel kerja input
 * pelanggan tanpa memaksa admin membuka menu Pelanggan lebih dulu.
 *
 * Detail teknis: total_qty diisi admin di sini (jumlah sudah diketahui saat
 * order dibuat), dan design_ids memilih desain dari galeri pelanggan (minimal
 * 1). file_count TIDAK dikirim client — diturunkan dari jumlah design_ids di
 * service. created_by dari token.
 */
export const createOrderSchema = Yup.object({
  customer_id: Yup.string()
    .trim()
    .when("customer", {
      is: (customer) => customer === undefined,
      then: (schema) => schema.required("Pelanggan wajib dipilih"),
      otherwise: (schema) => schema.strip(),
    }),
  customer: Yup.object({
    whatsapp: Yup.string()
      .trim()
      .transform((v) => normalizeWhatsapp(v))
      .matches(WHATSAPP_PATTERN, "Nomor WhatsApp tidak valid")
      .required("Nomor WhatsApp wajib diisi"),
    // name opsional di skema: pelanggan LAMA tidak perlu kirim nama. Service
    // yang mewajibkan name saat nomor ternyata belum terdaftar.
    name: Yup.string()
      .trim()
      .max(80, "Nama pelanggan maksimal 80 karakter"),
    note: Yup.string().trim().max(200, "Catatan pelanggan maksimal 200 karakter"),
  })
    .default(undefined)
    .noUnknown(),
  jenis: Yup.string()
    .oneOf(JENIS_LIST, "Jenis harus DTF atau POLYFLEX")
    .required("Jenis sablon wajib dipilih"),
  // Desain yang dipakai: minimal 1 id, semua harus milik pelanggan yang sama
  // (divalidasi di service). Diterima sebagai array string ObjectId.
  design_ids: Yup.array()
    .transform((value, original) => {
      if (original === undefined || original === "") return undefined;
      return Array.isArray(original) ? original : [original];
    })
    .of(Yup.string().trim().required())
    .min(1, "Pilih minimal satu desain")
    .required("Pilih minimal satu desain"),
  total_qty: Yup.number()
    .transform(kosongJadiUndefined)
    .integer("total_qty harus bilangan bulat")
    .min(1, "total_qty minimal 1")
    .required("Jumlah (total_qty) wajib diisi"),
  deadline: Yup.date()
    .transform(kosongJadiUndefined)
    .typeError("deadline harus tanggal yang valid")
    .nullable(),
  catatan: Yup.string().trim().max(500, "Catatan maksimal 500 karakter"),
}).test(
  "pelanggan-wajib",
  "Sertakan customer_id atau data pelanggan (customer)",
  (value) => Boolean(value.customer_id || value.customer)
);

/**
 * PATCH /orders/:id — ubah data order (ADMIN).
 */
export const updateOrderSchema = Yup.object({
  customer_id: Yup.string().trim(),
  jenis: Yup.string().oneOf(JENIS_LIST, "Jenis harus DTF atau POLYFLEX"),
  design_ids: Yup.array()
    .transform((value, original) => {
      if (original === undefined || original === "") return undefined;
      return Array.isArray(original) ? original : [original];
    })
    .of(Yup.string().trim().required())
    .min(1, "Pilih minimal satu desain"),
  total_qty: Yup.number()
    .transform(kosongJadiUndefined)
    .integer("total_qty harus bilangan bulat")
    .min(1, "total_qty minimal 1"),
  deadline: Yup.date()
    .transform(kosongJadiUndefined)
    .typeError("deadline harus tanggal yang valid")
    .nullable(),
  catatan: Yup.string().trim().max(500, "Catatan maksimal 500 karakter"),
  total_harga: Yup.number()
    .transform(kosongJadiUndefined)
    .min(0, "total_harga tidak boleh negatif")
    .nullable(),
  metode_bayar: Yup.string()
    .oneOf(METODE_BAYAR_LIST, "Metode bayar harus CASH atau TRANSFER")
    .nullable(),
});


/**
 * PATCH /orders/:id/status — majukan satu langkah.
 *
 * Sejak file_count & total_qty diisi saat order dibuat (dari design_ids &
 * input admin), transisi keluar ANTRI_DESAIN hanya "menandai desain selesai" —
 * tidak ada angka yang perlu dikirim. catatan opsional untuk semua transisi.
 */
export const majukanStatusSchema = Yup.object({
  catatan: Yup.string().trim().max(300, "Catatan maksimal 300 karakter"),
});

/** PATCH /orders/:id/selesai — catat pembayaran saat serah terima. */
export const selesaikanOrderSchema = Yup.object({
  total_harga: Yup.number()
    .transform(kosongJadiUndefined)
    .min(0, "total_harga tidak boleh negatif")
    .required("total_harga wajib diisi"),
  metode_bayar: Yup.string()
    .oneOf(METODE_BAYAR_LIST, "Metode bayar harus CASH atau TRANSFER")
    .required("Metode bayar wajib dipilih"),
  catatan: Yup.string().trim().max(300, "Catatan maksimal 300 karakter"),
});

/** PATCH /orders/:id/koreksi — koreksi manual status (ADMIN). */
export const koreksiStatusSchema = Yup.object({
  status: Yup.string()
    .oneOf(STATUS_LIST, "Status tidak dikenal")
    .required("Status tujuan wajib diisi"),
  catatan: Yup.string()
    .trim()
    .max(300, "Catatan maksimal 300 karakter")
    .required("Alasan koreksi wajib diisi"),
});

/**
 * Query daftar order.
 *
 * status boleh dikirim berulang (?status=ANTRI_CETAK&status=PACKING) untuk
 * layar produksi yang menampilkan dua status sekaligus — ditampung sebagai
 * array di statusIn. aktif=true menyaring semua kecuali SELESAI.
 */
export const listOrderQuerySchema = Yup.object({
  jenis: Yup.string().oneOf(JENIS_LIST, "Jenis harus DTF atau POLYFLEX"),
  status: Yup.string().oneOf(STATUS_LIST, "Status tidak dikenal"),
  statusIn: Yup.array()
    .transform((value, original) => {
      if (original === undefined || original === "") return undefined;
      return Array.isArray(original) ? original : [original];
    })
    .of(Yup.string().oneOf(STATUS_LIST, "Status tidak dikenal")),
  aktif: Yup.boolean()
    .transform((v, original) => {
      if (original === "true") return true;
      if (original === "false") return false;
      return undefined;
    })
    .default(undefined),
  customer_id: Yup.string().trim(),
  search: Yup.string().trim().default(""),
  tgl: Yup.date()
    .transform(kosongJadiUndefined)
    .typeError("tgl harus tanggal yang valid"),
  page: Yup.number()
    .transform(kosongJadiUndefined)
    .integer("page harus bilangan bulat")
    .min(1, "page minimal 1")
    .default(1),
  limit: Yup.number()
    .transform(kosongJadiUndefined)
    .integer("limit harus bilangan bulat")
    .min(1, "limit minimal 1")
    .max(100, "limit maksimal 100")
    .default(10),
  sort: Yup.string()
    .oneOf(
      [
        "createdAt",
        "-createdAt",
        "updatedAt",
        "-updatedAt",
        "kode_order",
        "-kode_order",
        "deadline",
        "-deadline",
      ],
      "Nilai sort tidak dikenal"
    )
    .default("-createdAt"),
});
