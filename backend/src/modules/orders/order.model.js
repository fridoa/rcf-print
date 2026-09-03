import mongoose, { Schema } from "mongoose";
import {
  JENIS_LIST,
  STATUS,
  STATUS_LIST,
  METODE_BAYAR_LIST,
} from "./order.constant.js";

/**
 * Order RCF Print.
 *
 * Satu order = satu jenis sablon (DTF, POLYFLEX, atau SUBLIM), sesuai ERD
 * Revisi v2.
 * Order campuran diinput sebagai dua order terpisah dengan dua nomor.
 *
 * Field disimpan dengan nama sesuai ERD (kode_order, jenis, customer_id, ...)
 * — berbeda dari modul auth/customer yang memakai nama Inggris — karena ERD
 * adalah kontrak eksplisit untuk collection ini dan mockup client memakai
 * istilah tersebut. Konsistensi di dalam satu collection lebih penting
 * daripada keseragaman lintas modul di sini.
 */
const orderSchema = new Schema(
  {
    kode_order: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    jenis: {
      type: String,
      required: true,
      enum: JENIS_LIST,
    },
    customer_id: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    // Tanggal order dinormalkan ke awal hari WIB saat pembuatan; dipakai untuk
    // penomoran harian dan filter Data Order per tanggal.
    tgl_order: {
      type: Date,
      required: true,
    },
    // Nomor urut dalam hari + jenis tersebut; disimpan agar bisa diaudit
    // tanpa mengurai kode_order.
    seq_harian: {
      type: Number,
      required: true,
    },
    // Jumlah file desain & total qty ditentukan DESIGNER, bukan admin: dia
    // yang membuka file kiriman pelanggan (via WhatsApp — file tidak diunggah
    // ke sistem) dan tahu berapa file efektif serta berapa total potong yang
    // harus diproduksi. Karena itu keduanya null saat order dibuat dan terisi
    // saat designer menandai desain selesai.
    file_count: {
      type: Number,
      default: null,
      min: [0, "file_count tidak boleh negatif"],
    },
    total_qty: {
      type: Number,
      default: null,
      min: [1, "total_qty minimal 1"],
    },
    deadline: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: STATUS_LIST,
      default: STATUS.ANTRI_DESAIN,
    },
    // Diisi saat serah terima (READY → SELESAI). Null sampai saat itu.
    total_harga: {
      type: Number,
      default: null,
      min: [0, "total_harga tidak boleh negatif"],
    },
    metode_bayar: {
      type: String,
      enum: [...METODE_BAYAR_LIST, null],
      default: null,
    },
    catatan: {
      type: String,
      trim: true,
      maxlength: [500, "Catatan maksimal 500 karakter"],
      default: "",
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Diisi saat desain selesai (siapa yang menyelesaikan desain).
    designed_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Timestamp saat status → SELESAI. Dipakai rekap sebagai basis tanggal
    // pembayaran diterima.
    selesai_at: {
      type: Date,
      default: null,
    },
    // Kapan order masuk status yang sekarang. Dipakai untuk mendeteksi order
    // yang tertahan ("kesalip antrian" / "belum diambil").
    //
    // Tidak memakai updatedAt karena field itu ikut berubah saat admin cuma
    // mengedit catatan atau deadline — order yang macet 5 hari akan terlihat
    // baru tersentuh. Tidak memakai tgl_order karena order lama yang baru saja
    // maju ke langkah berikutnya bukan order yang tertahan; yang relevan adalah
    // umur di langkah SEKARANG.
    status_sejak: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index sesuai pola query di ERD.
orderSchema.index({ jenis: 1, status: 1 }); // daftar order aktif per layar
orderSchema.index({ tgl_order: 1, jenis: 1 }); // rekap harian & penomoran
orderSchema.index({ customer_id: 1 }); // riwayat pelanggan
orderSchema.index({ status: 1, updatedAt: -1 }); // urutan antrean
orderSchema.index({ status: 1, status_sejak: 1 }); // deteksi order tertahan

orderSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const OrderModel = mongoose.model("Order", orderSchema);

export default OrderModel;
