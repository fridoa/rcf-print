import createHttpError from "http-errors";
import OrderModel from "./order.model.js";
import CounterModel from "./counter.model.js";
import StatusLogModel from "./status-log.model.js";
import CustomerModel from "../customers/customer.model.js";
import customerService from "../customers/customer.service.js";
import {
  JENIS,
  STATUS,
  ALUR,
  PREFIX_JENIS,
  TRANSISI_ROLE,
} from "./order.constant.js";
import { ROLES } from "../auth/auth.constant.js";
import {
  formatDDMMYY,
  awalHariJakarta,
  awalHariBerikutnyaJakarta,
} from "../../utils/date.js";

/**
 * Ambil nomor urut harian berikutnya untuk satu jenis, secara atomik.
 *
 * findOneAndUpdate + $inc dijalankan di sisi MongoDB, jadi dua request paralel
 * tidak mungkin mendapat seq yang sama. $setOnInsert mengisi metadata hanya
 * saat dokumen counter baru dibuat (hari/jenis baru pertama kali dipakai).
 */
const ambilNomorHarian = async (jenis, ddmmyy, session) => {
  const prefix = PREFIX_JENIS[jenis];
  const key = `${prefix}-${ddmmyy}`;

  const counter = await CounterModel.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 }, $setOnInsert: { jenis, tanggal: ddmmyy } },
    { upsert: true, returnDocument: "after", session }
  );

  return counter.seq;
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Buat order baru.
 *
 * Fungsi ini SENGAJA tidak tahu dari mana requestnya datang — controller HTTP
 * maupun (nanti) webhook WhatsApp memanggil bentuk yang sama. Yang wajib hanya
 * customer_id + jenis + siapa yang membuat (created_by).
 *
 * file_count & total_qty TIDAK diisi di sini: yang menentukan keduanya adalah
 * designer (dia yang membuka file kiriman WhatsApp), jadi order lahir dengan
 * kedua angka null dan terisi saat designer menandai desain selesai.
 *
 * @param {object} input
 * @param {string} [input.customer_id]  pelanggan lama yang sudah dipilih
 * @param {object} [input.customer]     { whatsapp, name?, note? } untuk
 *                                       find-or-create by nomor (input 1 langkah)
 * @param {"DTF"|"POLYFLEX"|"SUBLIM"} input.jenis
 * @param {string} input.created_by  id user pembuat
 * @param {Date}   [input.deadline]
 * @param {string} [input.catatan]
 */
const create = async ({
  customer_id,
  customer,
  jenis,
  created_by,
  deadline,
  catatan,
}) => {
  // Tentukan pelanggan lebih dulu — bisa dari id (lama) atau dari nomor
  // (find-or-create). Ini dilakukan SEBELUM mengambil nomor urut supaya
  // pelanggan yang tidak valid tidak "membakar" satu nomor harian.
  let resolvedCustomerId = customer_id;

  if (!resolvedCustomerId && customer) {
    // Nomor jadi kunci: kalau sudah terdaftar dipakai yang lama, kalau belum
    // dibuat baru. Nama tersimpan TIDAK ditimpa (lihat findOrCreateByWhatsapp).
    const { customer: cust } = await customerService.findOrCreateByWhatsapp(
      customer
    );
    resolvedCustomerId = cust._id;
  } else {
    // customer_id eksplisit: pastikan pelanggannya benar-benar ada.
    const cust = await CustomerModel.findById(resolvedCustomerId);
    if (!cust) {
      throw createHttpError(404, "Pelanggan tidak ditemukan");
    }
  }

  const now = new Date();
  const ddmmyy = formatDDMMYY(now);
  const tgl_order = awalHariJakarta(now);

  const seq_harian = await ambilNomorHarian(jenis, ddmmyy);
  const kode_order = `${PREFIX_JENIS[jenis]}/${ddmmyy}/${String(
    seq_harian
  ).padStart(3, "0")}`;

  const order = await OrderModel.create({
    kode_order,
    jenis,
    customer_id: resolvedCustomerId,
    tgl_order,
    seq_harian,
    status: STATUS.ANTRI_DESAIN,
    status_sejak: now,
    deadline: deadline ?? null,
    catatan: catatan ?? "",
    created_by,
  });

  // populate supaya pemanggil (HTTP / nanti WA) langsung dapat data pelanggan
  // tanpa query lanjutan — mis. FE menampilkan nama di baris baru.
  await order.populate({ path: "customer_id", select: "name whatsapp" });

  // Log pembuatan: status_dari null menandai event "order dibuat".
  await StatusLogModel.create({
    order_id: order._id,
    status_dari: null,
    status_ke: STATUS.ANTRI_DESAIN,
    user_id: created_by,
    catatan: "Order dibuat",
  });

  return order;
};

/**
 * Daftar order dengan filter + paginasi.
 *
 * Filter yang didukung mengikuti kebutuhan tiap layar mockup:
 * - jenis            : DTF / POLYFLEX / SUBLIM
 * - status           : satu status, atau daftar status (untuk layar produksi)
 * - aktif=true       : semua status kecuali SELESAI (daftar order aktif)
 * - customer_id      : riwayat pelanggan
 * - search           : cari kode_order (case-insensitive)
 * - tgl              : order pada satu hari WIB tertentu (Data Order)
 * - tgl_dari/sampai  : rentang hari WIB (halaman Pesanan: 7 Hari/Bulan Ini)
 *
 * Jaring pengaman rentang tanggal: order yang BELUM selesai tidak boleh hilang
 * dari halaman Pesanan hanya karena tanggalnya di luar rentang — itu justru
 * pekerjaan yang paling perlu dilihat. Karena itu:
 *   - meta.aktif_di_luar_rentang menghitung berapa order non-SELESAI yang
 *     tersaring keluar oleh rentang (0 kalau tidak ada rentang);
 *   - sertakan_aktif_luar=true memasukkan mereka ke hasil ($or rentang ATAU
 *     order aktif), supaya admin bisa menampilkannya tanpa melebarkan rentang.
 * Filter tanggal tetap jujur secara default; keputusan menampilkan ada di FE.
 */
const list = async ({
  jenis,
  status,
  statusIn,
  aktif,
  customer_id,
  search,
  tgl,
  tgl_dari,
  tgl_sampai,
  sertakan_aktif_luar,
  page,
  limit,
  sort,
}) => {
  const filter = {};

  if (jenis) filter.jenis = jenis;

  if (statusIn && statusIn.length > 0) {
    filter.status = { $in: statusIn };
  } else if (status) {
    filter.status = status;
  } else if (aktif) {
    filter.status = { $ne: STATUS.SELESAI };
  }

  if (customer_id) filter.customer_id = customer_id;

  if (search) {
    filter.kode_order = { $regex: escapeRegex(search), $options: "i" };
  }

  // Rentang tanggal terpisah dari `filter` supaya bisa dipasang sebagai $or
  // bersama syarat "order aktif" tanpa mengganggu filter lain.
  let rentangTgl;
  if (tgl) {
    const target = new Date(tgl);
    rentangTgl = {
      $gte: awalHariJakarta(target),
      $lt: awalHariBerikutnyaJakarta(target),
    };
  } else if (tgl_dari || tgl_sampai) {
    rentangTgl = {};
    if (tgl_dari) rentangTgl.$gte = awalHariJakarta(new Date(tgl_dari));
    if (tgl_sampai) {
      rentangTgl.$lt = awalHariBerikutnyaJakarta(new Date(tgl_sampai));
    }
  }

  // Syarat "belum selesai" dipakai dua kali (hitung & $or), jadi dinamai.
  const belumSelesai = { status: { $ne: STATUS.SELESAI } };

  // Hitungan jaring pengaman hanya bermakna saat admin TIDAK mengunci status
  // sendiri. Kalau dia memilih status=SELESAI (atau daftar status di layar
  // produksi), "order aktif di luar rentang" bukan informasi yang dia minta.
  const statusDikunci = Boolean(status || (statusIn && statusIn.length > 0));

  const filterAkhir = { ...filter };
  if (rentangTgl) {
    if (sertakan_aktif_luar) {
      // Di dalam rentang, ATAU belum selesai (berapa pun tanggalnya).
      filterAkhir.$or = [{ tgl_order: rentangTgl }, belumSelesai];
    } else {
      filterAkhir.tgl_order = rentangTgl;
    }
  }

  const skip = (page - 1) * limit;

  const [items, total, aktifDiLuarRentang] = await Promise.all([
    OrderModel.find(filterAkhir)
      .populate("customer_id", "name whatsapp")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    OrderModel.countDocuments(filterAkhir),
    // Hanya relevan saat ada rentang, order luar rentang belum disertakan, dan
    // status tidak dikunci pemanggil.
    rentangTgl && !sertakan_aktif_luar && !statusDikunci
      ? OrderModel.countDocuments({
          ...filter,
          ...belumSelesai,
          tgl_order: { $not: rentangTgl },
        })
      : 0,
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    meta: {
      aktif_di_luar_rentang: aktifDiLuarRentang,
    },
  };
};

const getById = async (id) => {
  const order = await OrderModel.findById(id).populate(
    "customer_id",
    "name whatsapp"
  );
  if (!order) {
    throw createHttpError(404, "Order tidak ditemukan");
  }
  return order;
};

/** Status berikutnya di jalur jenis tsb, atau null jika sudah di ujung. */
const statusSetelah = (jenis, status) => {
  const alur = ALUR[jenis];
  const idx = alur.indexOf(status);
  if (idx === -1 || idx === alur.length - 1) return null;
  return alur[idx + 1];
};

/**
 * Majukan status order satu langkah sesuai jalur jenisnya.
 *
 * Dipakai untuk transisi non-final:
 *   ANTRI_DESAIN → ANTRI_CETAK/ANTRI_CUTTING/ANTRI_SUBLIM
 *                                              (DESIGNER, wajib file_count+qty)
 *   ANTRI_CETAK/ANTRI_CUTTING/ANTRI_SUBLIM → PACKING   (PRODUKSI)
 *   PACKING → READY                            (PACKING)
 *
 * READY → SELESAI TIDAK lewat sini — itu penyelesaian order (lihat selesaikan).
 *
 * @param {string} id
 * @param {object} aktor           { id, role } dari req.user
 * @param {object} [payload]       { file_count, total_qty, catatan }
 */
const majukanStatus = async (id, aktor, payload = {}) => {
  const order = await getById(id);

  const berikutnya = statusSetelah(order.jenis, order.status);

  // Sudah READY/SELESAI, atau tak ada langkah maju yang sah.
  if (!berikutnya || berikutnya === STATUS.SELESAI) {
    throw createHttpError(
      409,
      `Order berstatus ${order.status} tidak bisa dimajukan lewat endpoint ini`
    );
  }

  // Cek hak: role yang boleh memajukan ditentukan oleh status ASAL.
  // ADMIN boleh melakukan transisi maju apa pun (fleksibilitas operasional).
  const roleWajib = TRANSISI_ROLE[order.status];
  if (aktor.role !== ROLES.ADMIN && aktor.role !== roleWajib) {
    throw createHttpError(
      403,
      `Hanya ${roleWajib} (atau ADMIN) yang boleh memajukan order dari status ${order.status}`
    );
  }

  const statusDari = order.status;

  // Transisi keluar dari ANTRI_DESAIN = "selesai desain". DESIGNER-lah yang
  // menentukan berapa file efektif dan berapa total potong (dia yang membuka
  // kiriman pelanggan), jadi kedua angka WAJIB di titik ini — sekali order
  // masuk produksi, tak ada lagi kesempatan mengisinya di alur normal.
  if (statusDari === STATUS.ANTRI_DESAIN) {
    const fileBaru = payload.file_count ?? order.file_count;
    const qtyBaru = payload.total_qty ?? order.total_qty;

    if (fileBaru == null || qtyBaru == null) {
      throw createHttpError(
        400,
        "Jumlah file dan total qty wajib diisi saat menandai desain selesai"
      );
    }

    order.file_count = fileBaru;
    order.total_qty = qtyBaru;
    order.designed_by = aktor.id;
  }

  order.status = berikutnya;
  order.status_sejak = new Date();
  await order.save();

  await StatusLogModel.create({
    order_id: order._id,
    status_dari: statusDari,
    status_ke: berikutnya,
    user_id: aktor.id,
    catatan: payload.catatan ?? "",
  });

  return order;
};

/**
 * Selesaikan order (READY → SELESAI) sekaligus catat pembayaran.
 *
 * Hanya ADMIN. Harga & metode bayar diisi di sini — bukan saat order dibuat —
 * karena nilai final baru diketahui saat serah terima. selesai_at menjadi
 * basis tanggal rekap uang.
 *
 * @param {string} id
 * @param {object} aktor            { id, role }
 * @param {object} payload          { total_harga, metode_bayar, catatan }
 */
const selesaikan = async (id, aktor, { total_harga, metode_bayar, catatan }) => {
  const order = await getById(id);

  if (order.status !== STATUS.READY) {
    throw createHttpError(
      409,
      `Hanya order berstatus READY yang bisa diselesaikan (sekarang ${order.status})`
    );
  }

  order.status = STATUS.SELESAI;
  order.total_harga = total_harga;
  order.metode_bayar = metode_bayar;
  order.selesai_at = new Date();
  order.status_sejak = order.selesai_at;
  if (catatan !== undefined) order.catatan = catatan;
  await order.save();

  await StatusLogModel.create({
    order_id: order._id,
    status_dari: STATUS.READY,
    status_ke: STATUS.SELESAI,
    user_id: aktor.id,
    catatan: catatan ?? "Order selesai & pembayaran dicatat",
  });

  return order;
};

/**
 * Koreksi status secara manual (mundur atau lompat). Hanya ADMIN.
 *
 * Ini jalur pelarian untuk salah klik operator. Tidak dibatasi aturan
 * maju-satu-langkah, tapi status tujuan tetap harus sah untuk jenis order itu,
 * dan setiap koreksi wajib mencatat alasan di status_logs.
 *
 * @param {string} id
 * @param {object} aktor            { id, role }
 * @param {object} payload          { status, catatan }
 */
const koreksiStatus = async (id, aktor, { status, catatan }) => {
  const order = await getById(id);

  if (!ALUR[order.jenis].includes(status)) {
    throw createHttpError(
      400,
      `Status ${status} tidak berlaku untuk jenis ${order.jenis}`
    );
  }

  if (status === order.status) {
    throw createHttpError(409, `Order sudah berstatus ${status}`);
  }

  const statusDari = order.status;
  order.status = status;
  order.status_sejak = new Date();

  // Kalau dikoreksi keluar dari SELESAI, batalkan jejak penyelesaian supaya
  // rekap tidak menghitung uang untuk order yang tidak lagi selesai.
  if (statusDari === STATUS.SELESAI && status !== STATUS.SELESAI) {
    order.selesai_at = null;
    order.total_harga = null;
    order.metode_bayar = null;
  }

  await order.save();

  await StatusLogModel.create({
    order_id: order._id,
    status_dari: statusDari,
    status_ke: status,
    user_id: aktor.id,
    catatan: catatan ?? "Koreksi status oleh admin",
  });

  return order;
};

/** Riwayat perubahan status satu order (untuk audit / timeline). */
const getRiwayat = async (id) => {
  await getById(id); // 404 kalau order tidak ada
  return StatusLogModel.find({ order_id: id })
    .populate("user_id", "name role")
    .sort({ createdAt: 1 });
};

/**
 * Statistik ringkas untuk dashboard.
 *
 * Semua dihitung di sisi MongoDB (aggregate/count), tidak menarik dokumen ke
 * Node — jadi tetap ringan meski order menumpuk. Dipakai semua role; tiap
 * dashboard FE memilih bagian yang relevan (designer lihat perStatus, admin
 * lihat semuanya). Angka "hari ini" berbasis zona Jakarta.
 *
 * Bentuk hasil:
 *   perStatus  : { ANTRI_DESAIN: {count, qty}, ... } untuk SEMUA status non-final
 *   perStatusJenis : rincian antrian produksi per jenis (DTF/POLYFLEX/SUBLIM)
 *   aktifTotal : jumlah order belum SELESAI
 *   overdue    : order aktif yang deadline-nya sudah lewat (< awal hari ini)
 *   hariIni    : { orderBaru, selesai, pendapatan } berbasis WIB
 */
const statistik = async () => {
  const awalHariIni = awalHariJakarta(new Date());
  const awalBesok = awalHariBerikutnyaJakarta(new Date());

  // Satu pass agregasi untuk hitung per-status: jumlah order + total qty.
  const perStatusAgg = await OrderModel.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        qty: { $sum: { $ifNull: ["$total_qty", 0] } },
      },
    },
  ]);

  // Bentuk default: semua status dikenal ada, count 0 kalau tak ada dokumen.
  const perStatus = {};
  for (const s of Object.values(STATUS)) {
    perStatus[s] = { count: 0, qty: 0 };
  }
  for (const row of perStatusAgg) {
    if (perStatus[row._id]) {
      perStatus[row._id] = { count: row.count, qty: row.qty };
    }
  }

  // Antrian produksi dipecah per jenis: DESIGNER/PRODUKSI ingin tahu berapa
  // DTF vs POLYFLEX vs SUBLIM yang menunggu di langkah masing-masing.
  const perStatusJenisAgg = await OrderModel.aggregate([
    {
      $match: {
        status: {
          $in: [
            STATUS.ANTRI_DESAIN,
            STATUS.ANTRI_CETAK,
            STATUS.ANTRI_CUTTING,
            STATUS.ANTRI_SUBLIM,
            STATUS.PACKING,
          ],
        },
      },
    },
    {
      $group: {
        _id: { status: "$status", jenis: "$jenis" },
        count: { $sum: 1 },
      },
    },
  ]);
  const perStatusJenis = {};
  for (const row of perStatusJenisAgg) {
    const { status, jenis } = row._id;
    if (!perStatusJenis[status]) perStatusJenis[status] = {};
    perStatusJenis[status][jenis] = row.count;
  }

  const aktifFilter = { status: { $ne: STATUS.SELESAI } };

  const [aktifTotal, overdue, orderBaru, selesaiHariIni, uangHariIni] =
    await Promise.all([
      OrderModel.countDocuments(aktifFilter),
      // Overdue: masih aktif DAN punya deadline sebelum awal hari ini.
      OrderModel.countDocuments({
        ...aktifFilter,
        deadline: { $ne: null, $lt: awalHariIni },
      }),
      // Order baru masuk hari ini (berbasis tgl_order WIB).
      OrderModel.countDocuments({
        tgl_order: { $gte: awalHariIni, $lt: awalBesok },
      }),
      // Order selesai hari ini (berbasis selesai_at).
      OrderModel.countDocuments({
        status: STATUS.SELESAI,
        selesai_at: { $gte: awalHariIni, $lt: awalBesok },
      }),
      // Pendapatan hari ini: SUM total_harga order selesai hari ini.
      OrderModel.aggregate([
        {
          $match: {
            status: STATUS.SELESAI,
            selesai_at: { $gte: awalHariIni, $lt: awalBesok },
          },
        },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$total_harga", 0] } } } },
      ]),
    ]);

  return {
    perStatus,
    perStatusJenis,
    aktifTotal,
    overdue,
    hariIni: {
      orderBaru,
      selesai: selesaiHariIni,
      pendapatan: uangHariIni[0]?.total ?? 0,
    },
  };
};

/**
 * Order yang tertahan: belum SELESAI dan sudah terlalu lama di status yang
 * sekarang — di status APA PUN, karena order bisa mengendap di desain, cetak,
 * cutting, packing, atau menganggur di READY karena belum diambil.
 *
 * Bentuknya sengaja mirip "lewat deadline": satu daftar order konkret, tiap
 * baris menyebut order mana dan sedang berhenti di langkah mana. Angka agregat
 * per status disertakan (`per_status`) supaya admin bisa melihat langkah mana
 * yang jadi sumbat tanpa menghitung baris.
 *
 * Ambang dihitung dari status_sejak, bukan tgl_order: order dua minggu lalu
 * yang tadi pagi masuk PACKING sedang berjalan normal, sementara order tiga
 * hari lalu yang tak bergerak sejak dibuat justru masalahnya.
 *
 * @param {object} opsi
 * @param {number} opsi.ambangHari  Umur minimum di status sekarang (default 3)
 * @param {number} opsi.limit       Maksimum baris daftar (default 8)
 */
const tertahan = async ({ ambangHari = 3, limit = 8 } = {}) => {
  const batas = new Date(Date.now() - ambangHari * 24 * 60 * 60 * 1000);

  const filter = {
    status: { $ne: STATUS.SELESAI },
    status_sejak: { $lt: batas },
  };

  // Daftar dibatasi `limit` supaya panel dashboard tetap ringkas, tapi hitungan
  // per status memakai agregasi penuh — admin perlu tahu totalnya, bukan cuma
  // yang tampil ("+3 lainnya").
  const [items, perStatusAgg] = await Promise.all([
    OrderModel.find(filter)
      .populate({ path: "customer_id", select: "name whatsapp" })
      .select("kode_order jenis status status_sejak tgl_order deadline total_qty")
      .sort({ status_sejak: 1 }) // paling lama tertahan di atas
      .limit(limit),
    OrderModel.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  // Semua status non-final selalu ada sebagai kunci (count 0 kalau bersih),
  // supaya FE tidak perlu menebak status mana yang absen dari respons.
  const perStatus = {};
  for (const s of Object.values(STATUS)) {
    if (s !== STATUS.SELESAI) perStatus[s] = 0;
  }
  let total = 0;
  for (const row of perStatusAgg) {
    if (row._id in perStatus) perStatus[row._id] = row.count;
    total += row.count;
  }

  return {
    ambang_hari: ambangHari,
    total,
    per_status: perStatus,
    items,
  };
};

/**
 * Update data order (ADMIN).
 *
 * Mengubah data order (jenis, customer_id, file_count, total_qty, deadline, catatan, dll).
 */
const update = async (id, aktor, payload) => {
  const order = await OrderModel.findById(id);
  if (!order) {
    throw createHttpError(404, "Order tidak ditemukan");
  }

  if (payload.customer_id && payload.customer_id !== order.customer_id?.toString()) {
    const customer = await CustomerModel.findById(payload.customer_id);
    if (!customer) {
      throw createHttpError(404, "Pelanggan tidak ditemukan");
    }
    order.customer_id = customer._id;
  }

  if (payload.jenis) {
    if (!ALUR[payload.jenis].includes(order.status)) {
      throw createHttpError(
        400,
        `Status ${order.status} tidak kompatibel dengan jenis sablon ${payload.jenis}`
      );
    }
    order.jenis = payload.jenis;
  }

  if (payload.file_count !== undefined) order.file_count = payload.file_count;
  if (payload.total_qty !== undefined) order.total_qty = payload.total_qty;
  if (payload.deadline !== undefined) order.deadline = payload.deadline;
  if (payload.catatan !== undefined) order.catatan = payload.catatan;
  if (payload.total_harga !== undefined) order.total_harga = payload.total_harga;
  if (payload.metode_bayar !== undefined) order.metode_bayar = payload.metode_bayar;

  await order.save();

  await StatusLogModel.create({
    order_id: order._id,
    status_dari: order.status,
    status_ke: order.status,
    user_id: aktor.id,
    catatan: "Data order diperbarui oleh Admin",
  });

  return getById(order._id);
};

/**
 * Hapus order beserta status logs (ADMIN).
 */
const remove = async (id) => {
  const order = await OrderModel.findById(id);
  if (!order) {
    throw createHttpError(404, "Order tidak ditemukan");
  }

  await StatusLogModel.deleteMany({ order_id: id });
  await OrderModel.findByIdAndDelete(id);

  return { id, message: `Order ${order.kode_order} berhasil dihapus` };
};

export default {
  create,
  list,
  getById,
  update,
  remove,
  majukanStatus,
  selesaikan,
  koreksiStatus,
  getRiwayat,
  statistik,
  tertahan,
};

