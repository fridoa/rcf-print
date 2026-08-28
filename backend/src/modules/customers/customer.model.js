import mongoose, { Schema } from "mongoose";
import { normalizeWhatsapp, WHATSAPP_PATTERN } from "../../utils/phone.js";

/**
 * Pelanggan RCF Print.
 *
 * Mengacu collection `customers` di ERD (nama, no_wa). Nama field ditulis
 * dalam bahasa Inggris supaya konsisten dengan modul auth: name, whatsapp.
 *
 * whatsapp dibuat unik: satu nomor = satu pelanggan. Ini yang mencegah
 * pelanggan lama masuk lagi sebagai data baru saat admin lupa mencarinya
 * dulu. Kalau ternyata client punya kasus dua pelanggan berbagi satu
 * nomor (mis. satu HP untuk satu keluarga/toko), unique ini yang harus
 * dicabut lebih dulu.
 */
const customerSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Nama pelanggan wajib diisi"],
      trim: true,
      minlength: [3, "Nama pelanggan minimal 3 karakter"],
      maxlength: [80, "Nama pelanggan maksimal 80 karakter"],
    },
    whatsapp: {
      type: String,
      required: [true, "Nomor WhatsApp wajib diisi"],
      unique: true,
      trim: true,
      // Normalisasi dipasang di level schema juga, bukan hanya di validator,
      // supaya data yang masuk lewat seed script atau service lain
      // (mis. modul order saat membuat pelanggan baru) tetap seragam.
      set: normalizeWhatsapp,
      match: [WHATSAPP_PATTERN, "Nomor WhatsApp tidak valid"],
    },
    note: {
      type: String,
      trim: true,
      maxlength: [200, "Catatan maksimal 200 karakter"],
      default: "",
    },
  },
  { timestamps: true }
);

// Pencarian pelanggan di layar Data Order memakai nama; index ini yang
// dipakai saat daftar diurutkan/dicari per nama.
customerSchema.index({ name: 1 });

customerSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const CustomerModel = mongoose.model("Customer", customerSchema);

export default CustomerModel;
