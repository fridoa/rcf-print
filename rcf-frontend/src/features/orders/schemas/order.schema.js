import * as yup from "yup";
import {
  JENIS_LIST,
  METODE_BAYAR_LIST,
  STATUS_LIST,
} from "../constants/order.constants";

/**
 * Mirror dari backend/src/modules/orders/order.validator.js.
 * Validasi FE hanya untuk UX; server tetap validasi ulang.
 *
 * `deadline` & angka opsional: input <select>/<input> selalu string, jadi
 * "" ditransform ke undefined supaya tidak gagal typeError saat kosong.
 */
const kosongJadiUndefined = (v, original) => (original === "" ? undefined : v);

/**
 * POST /orders — buat order.
 *
 * Pelanggan: DI FE, pelanggan selalu di-resolve ke customer_id lebih dulu
 * (pelanggan baru dibuat oleh CustomerPicker → POST /customers sebelum order
 * disimpan), supaya galeri desain per-pelanggan bisa dimuat. Karena itu di
 * titik create order yang dikirim cukup customer_id. Backend tetap menerima
 * bentuk { customer } untuk pemakai non-FE (mis. webhook), tapi schema FE ini
 * hanya memvalidasi customer_id.
 *
 * design_ids: minimal 1 desain WAJIB dipilih dari galeri pelanggan. file_count
 * TIDAK dikirim klien — backend menurunkannya dari design_ids.length.
 *
 * total_qty: diisi admin saat create (qty sudah diketahui di awal), mirror
 * createOrderSchema backend.
 */
export const createOrderSchema = yup.object({
  customer_id: yup.string().trim().required("Pelanggan wajib dipilih"),
  design_ids: yup
    .array()
    .of(yup.string().trim())
    .min(1, "Pilih minimal satu desain")
    .required("Pilih minimal satu desain"),
  total_qty: yup
    .number()
    .transform(kosongJadiUndefined)
    .typeError("Total qty harus angka")
    .integer("Total qty harus bilangan bulat")
    .min(1, "Total qty minimal 1")
    .required("Total qty wajib diisi"),
  jenis: yup
    .string()
    .oneOf(JENIS_LIST, "Jenis harus DTF atau Polyflex")
    .required("Jenis sablon wajib dipilih"),
  deadline: yup
    .date()
    .transform(kosongJadiUndefined)
    .typeError("Deadline harus tanggal yang valid")
    .nullable(),
  catatan: yup.string().trim().max(500, "Catatan maksimal 500 karakter"),
});

/**
 * Form "Selesai Desain" (ANTRI_DESAIN → produksi).
 *
 * file_count & total_qty TIDAK lagi di sini — keduanya sudah tercatat saat
 * order dibuat (design_ids + total_qty). Memajukan status keluar dari
 * ANTRI_DESAIN kini sekadar menandai desain selesai, dengan catatan opsional
 * untuk operator produksi. Mirror order.validator.js backend yang sudah
 * melonggarkan transisi ini.
 */
export const selesaiDesainSchema = yup.object({
  catatan: yup.string().trim().max(300, "Catatan maksimal 300 karakter"),
});

/** Form "Selesaikan Order" (READY → SELESAI) + catat pembayaran. */
export const selesaikanOrderSchema = yup.object({
  total_harga: yup
    .number()
    .transform(kosongJadiUndefined)
    .typeError("Total harga harus angka")
    .min(0, "Total harga tidak boleh negatif")
    .required("Total harga wajib diisi"),
  metode_bayar: yup
    .string()
    // yup 1.7: oneOf menang atas required — sertakan "" di daftar supaya
    // placeholder kosong terlempar ke required ("wajib dipilih"), bukan
    // "harus Cash atau Transfer".
    .oneOf(["", ...METODE_BAYAR_LIST], "Metode bayar harus Cash atau Transfer")
    .required("Metode bayar wajib dipilih"),
  catatan: yup.string().trim().max(300, "Catatan maksimal 300 karakter"),
});

/**
 * Form "Koreksi Status" (PATCH /orders/:id/koreksi) — jalur pelarian ADMIN
 * untuk salah klik. Mirror backend koreksiStatusSchema: status tujuan wajib
 * dan alasan (catatan) WAJIB — koreksi harus terekam di riwayat kenapa
 * status dipindah manual.
 */
export const koreksiStatusSchema = yup.object({
  status: yup
    .string()
    .oneOf(STATUS_LIST, "Status tidak dikenal")
    .required("Status tujuan wajib dipilih"),
  catatan: yup
    .string()
    .trim()
    .max(300, "Alasan maksimal 300 karakter")
    .required("Alasan koreksi wajib diisi"),
});
