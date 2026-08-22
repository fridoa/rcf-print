import createHttpError from "http-errors";
import mongoose from "mongoose";
import CustomerModel from "./customer.model.js";
import { normalizeWhatsapp } from "../../utils/phone.js";

/**
 * Hitung order milik satu pelanggan.
 *
 * Modul order belum ada, jadi collection-nya diakses langsung lewat
 * driver — bukan lewat OrderModel. Ini disengaja supaya modul customer
 * tidak bergantung pada file yang masih kosong. Begitu order.model.js
 * jadi, ganti isi fungsi ini dengan OrderModel.countDocuments dan
 * hapus komentar ini.
 */
const hitungOrderPelanggan = async (customerId) => {
  const collection = mongoose.connection.collection("orders");
  return collection.countDocuments({
    customer_id: new mongoose.Types.ObjectId(String(customerId)),
  });
};

/**
 * Daftar pelanggan dengan pencarian + paginasi.
 *
 * search mencari di nama DAN nomor: admin di depan pelanggan biasanya
 * mengetik salah satu dari keduanya. Untuk nomor, kata kunci ikut
 * dinormalisasi lebih dulu supaya mengetik "0812" tetap menemukan
 * nomor yang tersimpan sebagai "62812...".
 *
 * Nama dicari dengan regex case-insensitive. Kata kunci di-escape supaya
 * karakter seperti "(" atau "+" tidak dianggap pola regex (dan tidak
 * bisa dipakai membuat query yang berat).
 */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const list = async ({ search, page, limit, sort }) => {
  const filter = {};

  if (search) {
    const pola = escapeRegex(search);
    const nomor = normalizeWhatsapp(search);

    filter.$or = [
      { name: { $regex: pola, $options: "i" } },
      { whatsapp: { $regex: `^${escapeRegex(nomor || search)}` } },
    ];
  }

  const skip = (page - 1) * limit;

  // dijalankan paralel: keduanya tidak saling bergantung
  const [items, total] = await Promise.all([
    CustomerModel.find(filter).sort(sort).skip(skip).limit(limit),
    CustomerModel.countDocuments(filter),
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
  const customer = await CustomerModel.findById(id);
  if (!customer) {
    throw createHttpError(404, "Pelanggan tidak ditemukan");
  }
  return customer;
};

/**
 * Nomor dicek manual lebih dulu supaya pesannya menyebut pelanggan mana
 * yang sudah memakai nomor itu — admin bisa langsung memilih data lama
 * daripada bingung kenapa gagal. Unique index tetap jadi pengaman
 * terakhir untuk dua request bersamaan (error 11000 → 409 di error handler).
 */
const create = async ({ name, whatsapp, note }) => {
  const nomor = normalizeWhatsapp(whatsapp);

  const sudahAda = await CustomerModel.findOne({ whatsapp: nomor });
  if (sudahAda) {
    throw createHttpError(
      409,
      `Nomor WhatsApp sudah terdaftar atas nama ${sudahAda.name}`
    );
  }

  return CustomerModel.create({ name, whatsapp: nomor, note });
};

/** Partial update; hanya field yang dikirim yang di-assign. */
const update = async (id, { name, whatsapp, note }) => {
  const customer = await getById(id);

  if (whatsapp !== undefined) {
    const nomor = normalizeWhatsapp(whatsapp);

    // `!== customer.whatsapp` supaya mengirim ulang nomor sendiri
    // tidak menghasilkan 409 karena bentrok dengan datanya sendiri
    if (nomor !== customer.whatsapp) {
      const dipakai = await CustomerModel.findOne({
        whatsapp: nomor,
        _id: { $ne: customer._id },
      });

      if (dipakai) {
        throw createHttpError(
          409,
          `Nomor WhatsApp sudah terdaftar atas nama ${dipakai.name}`
        );
      }

      customer.whatsapp = nomor;
    }
  }

  if (name !== undefined) customer.name = name;
  if (note !== undefined) customer.note = note;

  await customer.save();
  return customer;
};

/**
 * Hapus pelanggan.
 *
 * Ditolak kalau pelanggan sudah punya order: order menyimpan customer_id,
 * dan menghapus pelanggannya membuat riwayat order serta rekap menunjuk
 * data yang hilang. Ini keputusan yang mungkin ingin kamu ubah — alternatifnya
 * soft delete (field isActive) supaya pelanggan lama bisa disembunyikan
 * dari pencarian tanpa merusak riwayat.
 */
const remove = async (id) => {
  const customer = await getById(id);

  const jumlahOrder = await hitungOrderPelanggan(customer._id);
  if (jumlahOrder > 0) {
    throw createHttpError(
      409,
      `Pelanggan tidak bisa dihapus karena sudah punya ${jumlahOrder} order`
    );
  }

  await customer.deleteOne();
  return customer;
};

export default { list, getById, create, update, remove };
