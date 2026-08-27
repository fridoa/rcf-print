import mongoose, { Schema } from "mongoose";

/**
 * Desain (file gambar) milik seorang pelanggan.
 *
 * Galeri per-pelanggan: tiap desain terikat ke satu customer_id. Saat membuat
 * order, admin memilih desain dari galeri pelanggan yang bersangkutan (atau
 * mengunggah baru — yang langsung masuk galeri itu). Order menyimpan
 * design_ids yang merujuk dokumen-dokumen ini.
 *
 * Dedup byte-identik: `hash` adalah sha256 dari isi file. Unik per pelanggan
 * (index {customer_id, hash}) supaya file yang persis sama tidak digandakan —
 * upload ulang file identik mengembalikan desain lama (idempotent, sesuai
 * keputusan opsi (a)).
 */
const designSchema = new Schema(
  {
    customer_id: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    // Label opsional supaya admin bisa mengenali desain di galeri
    // ("Logo depan", "Punggung v2"). Default nama file asli.
    label: {
      type: String,
      trim: true,
      maxlength: [120, "Label desain maksimal 120 karakter"],
      default: "",
    },
    // sha256 heksadesimal dari isi file — kunci dedup per pelanggan.
    hash: {
      type: String,
      required: true,
    },
    // Metadata dari storage (ImageKit). fileId dipakai untuk menghapus.
    file_id: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnail_url: {
      type: String,
      default: "",
    },
    // Nama file asli & ukuran (byte) — informasi tampilan galeri.
    original_name: {
      type: String,
      default: "",
    },
    size: {
      type: Number,
      default: 0,
      min: [0, "size tidak boleh negatif"],
    },
    uploaded_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Dedup byte-identik dijamin di level DB, per pelanggan. Dua pelanggan berbeda
// boleh punya file dengan hash sama (mis. template umum) tanpa bentrok.
designSchema.index({ customer_id: 1, hash: 1 }, { unique: true });
// Galeri diurut terbaru dulu.
designSchema.index({ customer_id: 1, createdAt: -1 });

designSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const DesignModel = mongoose.model("Design", designSchema);

export default DesignModel;
