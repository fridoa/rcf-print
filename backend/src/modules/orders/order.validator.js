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
 * Pesan error jenis dirakit dari JENIS_LIST, bukan ditulis manual, supaya
 * menambah jenis baru (mis. SUBLIM) tidak menyisakan pesan lama yang bohong.
 */
const PESAN_JENIS = `Jenis harus salah satu dari: ${JENIS_LIST.join(", ")}`;

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
 * Detail teknis: file_count & total_qty TIDAK diisi di sini. Yang menentukan
 * keduanya adalah DESIGNER — dia yang membuka file kiriman WhatsApp dan tahu
 * berapa file efektif serta berapa total potong yang harus diproduksi. Angka
 * itu masuk saat designer menandai desain selesai (PATCH /orders/:id/status).
 * created_by dari token.
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
    .oneOf(JENIS_LIST, PESAN_JENIS)
    .required("Jenis sablon wajib dipilih"),
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
  jenis: Yup.string().oneOf(JENIS_LIST, PESAN_JENIS),
  file_count: Yup.number()
    .transform(kosongJadiUndefined)
    .integer("Jumlah file harus bilangan bulat")
    .min(1, "Jumlah file minimal 1"),
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
 * file_count & total_qty dikirim saat transisi keluar ANTRI_DESAIN ("selesai
 * desain"): designer-lah yang menentukan berapa file efektif dan berapa total
 * potong setelah melihat kiriman pelanggan. Di skema keduanya opsional karena
 * endpoint ini juga dipakai transisi produksi/packing yang tidak mengirim
 * angka — service yang mewajibkannya khusus untuk transisi dari ANTRI_DESAIN.
 * catatan opsional untuk semua transisi.
 */
export const majukanStatusSchema = Yup.object({
  file_count: Yup.number()
    .transform(kosongJadiUndefined)
    .integer("Jumlah file harus bilangan bulat")
    .min(1, "Jumlah file minimal 1"),
  total_qty: Yup.number()
    .transform(kosongJadiUndefined)
    .integer("total_qty harus bilangan bulat")
    .min(1, "total_qty minimal 1"),
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
 *
 * Rentang tanggal: tgl_dari/tgl_sampai (basis tgl_order). `tgl` = satu hari,
 * dipertahankan untuk pemanggil lama.
 */
export const listOrderQuerySchema = Yup.object({
  jenis: Yup.string().oneOf(JENIS_LIST, PESAN_JENIS),
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
  // Rentang tanggal order (basis tgl_order), inklusif di kedua ujung. Dipakai
  // halaman Pesanan dengan preset 7 Hari / Bulan Ini / Custom. `tgl` (satu
  // hari) tetap didukung untuk pemanggil lama; kalau keduanya dikirim, `tgl`
  // yang menang di service.
  tgl_dari: Yup.date()
    .transform(kosongJadiUndefined)
    .typeError("tgl_dari harus tanggal yang valid"),
  tgl_sampai: Yup.date()
    .transform(kosongJadiUndefined)
    .typeError("tgl_sampai harus tanggal yang valid")
    .when("tgl_dari", (tgl_dari, schema) =>
      // Cek isNaN: kalau tgl_dari tak bisa diparse, Yup masih meneruskan
      // Invalid Date ke sini dan schema.min() melempar RangeError (jadi 500).
      // Biarkan typeError tgl_dari yang bicara. (Pola sama: rekapQuerySchema.)
      tgl_dari && tgl_dari[0] && !Number.isNaN(tgl_dari[0].getTime())
        ? schema.min(tgl_dari[0], "tgl_sampai tidak boleh sebelum tgl_dari")
        : schema
    ),
  // Jaring pengaman: order yang BELUM selesai tidak boleh hilang hanya karena
  // jatuh di luar rentang tanggal. FE menghitungnya lewat meta, lalu boleh
  // memintanya ikut ditampilkan dengan flag ini.
  sertakan_aktif_luar: Yup.boolean()
    .transform((v, original) => {
      if (original === "true") return true;
      if (original === "false") return false;
      return undefined;
    })
    .default(undefined),
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
        "tgl_order",
        "-tgl_order",
      ],
      "Nilai sort tidak dikenal"
    )
    .default("-createdAt"),
});

/**
 * Query panel "order tertahan" di dashboard.
 *
 * ambang_hari dibatasi 1..90: di bawah 1 hari setiap order aktif akan ikut
 * terhitung (panel jadi tak berarti), di atas 90 hari sudah bukan urusan
 * dashboard harian. limit kecil karena ini panel ringkas, bukan daftar penuh —
 * daftar lengkapnya ada di halaman Pesanan.
 */
export const orderTertahanQuerySchema = Yup.object({
  ambang_hari: Yup.number()
    .transform(kosongJadiUndefined)
    .integer("ambang_hari harus bilangan bulat")
    .min(1, "ambang_hari minimal 1")
    .max(90, "ambang_hari maksimal 90")
    .default(3),
  limit: Yup.number()
    .transform(kosongJadiUndefined)
    .integer("limit harus bilangan bulat")
    .min(1, "limit minimal 1")
    .max(50, "limit maksimal 50")
    .default(8),
});
