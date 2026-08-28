import crypto from "crypto";
import createHttpError from "http-errors";
import mongoose from "mongoose";
import DesignModel from "./design.model.js";
import CustomerModel from "../customers/customer.model.js";
import { uploadDesain, hapusDesain } from "../../utils/storage.js";

/**
 * Layanan galeri desain per-pelanggan.
 *
 * Alur upload sengaja tahan-ulang (idempotent) untuk file byte-identik:
 * hash sha256 file dicek lebih dulu; kalau pelanggan itu sudah punya desain
 * dengan hash sama, desain lama dikembalikan tanpa upload ke storage dan
 * tanpa baris baru (keputusan opsi (a): "diam-diam pakai desain lama").
 */

const sha256 = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

/**
 * Escape kata kunci supaya karakter seperti "(" atau "+" tidak dianggap pola
 * regex (dan tidak bisa dipakai membuat query yang berat / ReDoS). Sama dengan
 * pola di customer.service.js.
 */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Pastikan pelanggan ada (404 kalau tidak) dan kembalikan dokumennya. */
const pastikanCustomer = async (customerId) => {
  const cust = await CustomerModel.findById(customerId);
  if (!cust) {
    throw createHttpError(404, "Pelanggan tidak ditemukan");
  }
  return cust;
};

/**
 * Upload satu desain ke galeri seorang pelanggan.
 *
 * @param {object} p
 * @param {string} p.customer_id
 * @param {string} [p.label]
 * @param {Buffer} p.buffer          isi file (dari multer)
 * @param {string} p.originalName    nama file asli
 * @param {number} p.size            ukuran byte
 * @param {string} p.uploaded_by     id user pengunggah
 * @returns {{ design: Document, deduped: boolean }}
 */
const upload = async ({
  customer_id,
  label,
  buffer,
  originalName,
  size,
  uploaded_by,
}) => {
  if (!buffer || buffer.length === 0) {
    throw createHttpError(400, "File desain wajib diunggah");
  }

  await pastikanCustomer(customer_id);

  const hash = sha256(buffer);

  // Dedup: kalau pelanggan ini sudah punya file byte-identik, pakai yang lama.
  // Storage tidak disentuh — hemat bandwidth & tidak menggandakan objek.
  const existing = await DesignModel.findOne({ customer_id, hash });
  if (existing) {
    return { design: existing, deduped: true };
  }

  // Upload ke storage (ImageKit / fake saat autotest) lebih dulu; baru simpan
  // dokumennya. Kalau upload gagal, tidak ada baris yatim di DB.
  const stored = await uploadDesain({ buffer, fileName: originalName });

  try {
    const design = await DesignModel.create({
      customer_id,
      label: label ?? "",
      hash,
      file_id: stored.fileId,
      url: stored.url,
      thumbnail_url: stored.thumbnailUrl ?? "",
      original_name: originalName ?? stored.name ?? "",
      size: size ?? stored.size ?? 0,
      uploaded_by,
    });
    return { design, deduped: false };
  } catch (error) {
    // Balapan: dua upload file identik nyaris bersamaan bisa lolos cek
    // findOne lalu bentrok di unique index {customer_id, hash}. Perlakukan
    // sebagai dedup — bersihkan file yang barusan terunggah, kembalikan
    // desain yang sudah ada.
    if (error.code === 11000) {
      await hapusDesain(stored.fileId).catch(() => {});
      const sudahAda = await DesignModel.findOne({ customer_id, hash });
      if (sudahAda) return { design: sudahAda, deduped: true };
    }
    // Kegagalan lain: jangan tinggalkan file yatim di storage.
    await hapusDesain(stored.fileId).catch(() => {});
    throw error;
  }
};

/** Daftar desain milik satu pelanggan (galeri), terbaru dulu, dengan paginasi. */
const list = async ({ customer_id, search, page, limit }) => {
  await pastikanCustomer(customer_id);

  const filter = { customer_id };

  // Pencarian opsional: cocokkan kata kunci ke label ATAU nama file asli
  // (case-insensitive). Admin biasa mengenali desain dari salah satunya.
  if (search) {
    const pola = escapeRegex(search);
    filter.$or = [
      { label: { $regex: pola, $options: "i" } },
      { original_name: { $regex: pola, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    DesignModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    DesignModel.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const getById = async (id) => {
  const design = await DesignModel.findById(id);
  if (!design) {
    throw createHttpError(404, "Desain tidak ditemukan");
  }
  return design;
};

/**
 * Hapus desain dari galeri.
 *
 * Ditolak kalau desain masih dipakai order mana pun: order menyimpan
 * design_ids dan menghapus desainnya membuat riwayat order menunjuk file yang
 * hilang. Modul order diakses lewat driver langsung supaya modul design tidak
 * meng-import OrderModel (menghindari siklus import antar-modul).
 */
const remove = async (id) => {
  const design = await getById(id);

  const dipakai = await mongoose.connection
    .collection("orders")
    .countDocuments({ design_ids: design._id });

  if (dipakai > 0) {
    throw createHttpError(
      409,
      `Desain tidak bisa dihapus karena masih dipakai ${dipakai} order`
    );
  }

  // Hapus file di storage dulu; kalau gagal, dokumen tetap ada (bisa dicoba
  // lagi) daripada dokumen hilang tapi file menggantung.
  await hapusDesain(design.file_id);
  await design.deleteOne();

  return design;
};

/**
 * Validasi bahwa sekumpulan design_ids benar-benar ada DAN semuanya milik
 * customer yang sama. Dipakai order.service saat membuat order supaya tidak
 * ada order yang mencampur desain antar-pelanggan.
 *
 * @returns {mongoose.Types.ObjectId[]} daftar id tervalidasi (unik)
 */
const validateMilikCustomer = async (designIds, customerId) => {
  if (!Array.isArray(designIds) || designIds.length === 0) {
    throw createHttpError(400, "Pilih minimal satu desain untuk order");
  }

  // Dedup id yang dikirim dobel.
  const unik = [...new Set(designIds.map((x) => String(x)))];

  const designs = await DesignModel.find({
    _id: { $in: unik },
    customer_id: customerId,
  });

  if (designs.length !== unik.length) {
    throw createHttpError(
      400,
      "Sebagian desain tidak ditemukan atau bukan milik pelanggan ini"
    );
  }

  return designs.map((d) => d._id);
};

export default {
  upload,
  list,
  getById,
  remove,
  validateMilikCustomer,
};
