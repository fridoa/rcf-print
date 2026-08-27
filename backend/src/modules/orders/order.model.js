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
 * Satu order = satu jenis sablon (DTF atau POLYFLEX), sesuai ERD Revisi v2.
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
    // Desain yang dipakai order ini. Dipilih dari galeri pelanggan saat order
    // dibuat (minimal 1). Semua desain wajib milik customer_id yang sama —
    // divalidasi di service. file_count diturunkan dari panjang array ini.
    design_ids: {
      type: [{ type: Schema.Types.ObjectId, ref: "Design" }],
      default: [],
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
    // file_count diturunkan dari jumlah design_ids saat order dibuat; total_qty
    // diisi admin saat membuat order (keputusan: harga & jumlah diketahui di
    // awal, desain sudah dipilih dari galeri). Keduanya tidak lagi null setelah
    // create — designer hanya "menandai desain selesai" untuk memajukan status.
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
  },
  { timestamps: true }
);

// Index sesuai pola query di ERD.
orderSchema.index({ jenis: 1, status: 1 }); // daftar order aktif per layar
orderSchema.index({ tgl_order: 1, jenis: 1 }); // rekap harian & penomoran
orderSchema.index({ customer_id: 1 }); // riwayat pelanggan
orderSchema.index({ status: 1, updatedAt: -1 }); // urutan antrean

orderSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const OrderModel = mongoose.model("Order", orderSchema);

export default OrderModel;
