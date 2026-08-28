import OrderModel from "../orders/order.model.js";
import { STATUS, METODE_BAYAR } from "../orders/order.constant.js";
import {
  awalHariJakarta,
  awalHariBerikutnyaJakarta,
  awalBulanJakarta,
  TZ_JAKARTA,
} from "../../utils/date.js";

/**
 * Rekap harian order yang SUDAH SELESAI.
 *
 * Basis tanggal = `selesai_at` (saat pembayaran diterima), BUKAN `tgl_order`.
 * Ini keputusan dari catatan ERD: uang yang masuk hari ini harus tercatat
 * di hari ini, bukan di tanggal order dibuat beberapa hari lalu. Kalau nanti
 * client minta basis tgl_order, cukup ganti field di $match dan $dateToString.
 *
 * Pengelompokan hari memakai zona Asia/Jakarta lewat operator tanggal MongoDB
 * ($dateToString dengan timezone), supaya batas hari konsisten dengan seluruh
 * aplikasi tanpa menarik semua dokumen ke Node untuk dikelompokkan manual.
 *
 * Kolom per baris (sesuai mockup): tanggal, pelanggan (jumlah customer unik),
 * file (SUM file_count), qty (SUM total_qty), cash & transfer (SUM total_harga
 * per metode). Baris TOTAL dihitung di service dari hasil, bukan di pipeline.
 */
const rekapHarian = async ({ dari, sampai } = {}) => {
  // Default: bulan berjalan s/d hari ini. Batas bawah = awal hari `dari`,
  // batas atas = awal hari SETELAH `sampai` (eksklusif) supaya seluruh hari
  // `sampai` ikut terhitung.
  const mulai = dari ? awalHariJakarta(dari) : awalBulanJakarta();
  const selesai = sampai
    ? awalHariBerikutnyaJakarta(sampai)
    : awalHariBerikutnyaJakarta(new Date());

  const pipeline = [
    {
      $match: {
        status: STATUS.SELESAI,
        selesai_at: { $gte: mulai, $lt: selesai },
      },
    },
    {
      // Kunci hari dalam zona Jakarta: "YYYY-MM-DD".
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$selesai_at",
            timezone: TZ_JAKARTA,
          },
        },
        pelangganSet: { $addToSet: "$customer_id" },
        file: { $sum: { $ifNull: ["$file_count", 0] } },
        qty: { $sum: { $ifNull: ["$total_qty", 0] } },
        cash: {
          $sum: {
            $cond: [
              { $eq: ["$metode_bayar", METODE_BAYAR.CASH] },
              { $ifNull: ["$total_harga", 0] },
              0,
            ],
          },
        },
        transfer: {
          $sum: {
            $cond: [
              { $eq: ["$metode_bayar", METODE_BAYAR.TRANSFER] },
              { $ifNull: ["$total_harga", 0] },
              0,
            ],
          },
        },
        jumlahOrder: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        tanggal: "$_id",
        pelanggan: { $size: "$pelangganSet" },
        file: 1,
        qty: 1,
        cash: 1,
        transfer: 1,
        jumlahOrder: 1,
      },
    },
    { $sort: { tanggal: 1 } },
  ];

  const baris = await OrderModel.aggregate(pipeline);

  // Baris TOTAL: uang dijumlah langsung; pelanggan TOTAL sengaja TIDAK
  // menjumlah kolom pelanggan harian (satu orang yang order di dua hari akan
  // terhitung dua kali) — untuk total dipakai jumlah customer unik lintas
  // seluruh rentang, dihitung terpisah agar akurat.
  const total = baris.reduce(
    (acc, b) => ({
      file: acc.file + b.file,
      qty: acc.qty + b.qty,
      cash: acc.cash + b.cash,
      transfer: acc.transfer + b.transfer,
      jumlahOrder: acc.jumlahOrder + b.jumlahOrder,
    }),
    { file: 0, qty: 0, cash: 0, transfer: 0, jumlahOrder: 0 }
  );

  const pelangganUnik = await OrderModel.distinct("customer_id", {
    status: STATUS.SELESAI,
    selesai_at: { $gte: mulai, $lt: selesai },
  });

  return {
    rentang: { dari: mulai, sampai: selesai },
    baris,
    total: {
      ...total,
      pelanggan: pelangganUnik.length,
      pendapatan: total.cash + total.transfer,
    },
  };
};

export default { rekapHarian };
