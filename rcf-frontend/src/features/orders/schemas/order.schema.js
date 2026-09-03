import * as yup from "yup";
import {
  JENIS_LIST,
  JENIS_LABEL,
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
 * Pesan error jenis dirakit dari daftar jenis, bukan ditulis manual, supaya
 * menambah jenis baru (mis. Sublim) tidak menyisakan pesan lama yang bohong.
 */
const PESAN_JENIS = `Jenis harus salah satu dari: ${JENIS_LIST.map(
  (j) => JENIS_LABEL[j] ?? j
).join(", ")}`;

/**
 * POST /orders — buat order.
 *
 * Pelanggan: DI FE, pelanggan selalu di-resolve ke customer_id lebih dulu
 * (pelanggan baru dibuat oleh CustomerPicker → POST /customers sebelum order
 * disimpan). Karena itu di titik create order yang dikirim cukup customer_id.
 * Backend tetap menerima bentuk { customer } untuk pemakai non-FE (mis.
 * webhook), tapi schema FE ini hanya memvalidasi customer_id.
 *
 * file_count & total_qty TIDAK di sini: yang menentukan keduanya adalah
 * designer (dia yang membuka file kiriman WhatsApp dan tahu berapa file
 * efektif serta berapa total potong). Admin hanya mencatat pelanggan, jenis,
 * deadline, dan catatan. Mirror createOrderSchema backend.
 */
export const createOrderSchema = yup.object({
  customer_id: yup.string().trim().required("Pelanggan wajib dipilih"),
  jenis: yup
    .string()
    .oneOf(JENIS_LIST, PESAN_JENIS)
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
 * Di sinilah file_count & total_qty ditetapkan: designer yang membuka kiriman
 * pelanggan tahu berapa file efektif dan berapa total potong yang harus
 * diproduksi. Keduanya WAJIB — setelah order masuk produksi tidak ada lagi
 * titik pengisian di alur normal (backend menolak transisi tanpa angka ini).
 */
export const selesaiDesainSchema = yup.object({
  file_count: yup
    .number()
    .transform(kosongJadiUndefined)
    .typeError("Jumlah file harus angka")
    .integer("Jumlah file harus bilangan bulat")
    .min(1, "Jumlah file minimal 1")
    .required("Jumlah file wajib diisi"),
  total_qty: yup
    .number()
    .transform(kosongJadiUndefined)
    .typeError("Total qty harus angka")
    .integer("Total qty harus bilangan bulat")
    .min(1, "Total qty minimal 1")
    .required("Total qty wajib diisi"),
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
