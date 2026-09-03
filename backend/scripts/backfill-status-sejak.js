import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import OrderModel from "../src/modules/orders/order.model.js";
import StatusLogModel from "../src/modules/orders/status-log.model.js";
import { env } from "../src/config/env.js";

/**
 * Backfill field `status_sejak` untuk order yang dibuat sebelum field ini ada.
 *
 * Sumber nilai, berurutan:
 *   1. createdAt log status terakhir order itu — ini yang paling akurat, karena
 *      status_logs memang mencatat setiap perpindahan status.
 *   2. updatedAt order — dipakai kalau lognya hilang/tak lengkap. Bisa terlalu
 *      baru (ikut berubah saat edit catatan), artinya order akan terlihat lebih
 *      "segar" dari kenyataan. Itu arah kesalahan yang aman: panel order
 *      tertahan tidak akan memunculkan false alarm, paling telat mendeteksi.
 *
 * Aman dijalankan berulang: hanya menyentuh dokumen yang status_sejak-nya masih
 * kosong. Jalankan dengan `--dry-run` untuk melihat rencananya tanpa menulis
 * apa pun — operasi ini bulk write, jadi wajar diperiksa dulu.
 */
const DRY_RUN = process.argv.includes("--dry-run");

const run = async () => {
  await connectDatabase();
  console.log(
    `[backfill] environment: ${env.APP_ENV} — database: ${env.DATABASE_NAME}` +
      (DRY_RUN ? " — DRY RUN (tidak menulis)" : "")
  );

  const perluIsi = await OrderModel.find({
    $or: [{ status_sejak: null }, { status_sejak: { $exists: false } }],
  }).select("_id kode_order status updatedAt");

  if (perluIsi.length === 0) {
    console.log("[backfill] tidak ada order tanpa status_sejak — selesai");
    await disconnectDatabase();
    process.exit(0);
  }

  console.log(`[backfill] ${perluIsi.length} order perlu diisi`);

  // Ambil log terakhir untuk semua order sekaligus, bukan query per order:
  // jumlah order bisa ribuan dan N+1 query ke Atlas itu mahal.
  const logTerakhir = await StatusLogModel.aggregate([
    { $match: { order_id: { $in: perluIsi.map((o) => o._id) } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$order_id", createdAt: { $first: "$createdAt" } } },
  ]);

  const petaLog = new Map(
    logTerakhir.map((row) => [row._id.toString(), row.createdAt])
  );

  let dariLog = 0;
  let dariUpdatedAt = 0;

  const operasi = perluIsi.map((order) => {
    const dariLogNya = petaLog.get(order._id.toString());
    if (dariLogNya) dariLog += 1;
    else dariUpdatedAt += 1;

    return {
      updateOne: {
        filter: { _id: order._id },
        update: { $set: { status_sejak: dariLogNya ?? order.updatedAt } },
      },
    };
  });

  const hasil = DRY_RUN ? { modifiedCount: 0 } : await OrderModel.bulkWrite(operasi);

  if (DRY_RUN) {
    console.log(
      `[backfill] DRY RUN: ${operasi.length} order AKAN diperbarui ` +
        `(${dariLog} dari status_logs, ${dariUpdatedAt} fallback updatedAt)`
    );
    console.log("[backfill] jalankan tanpa --dry-run untuk menerapkan");
  } else {
    console.log(
      `[backfill] selesai: ${hasil.modifiedCount} order diperbarui ` +
        `(${dariLog} dari status_logs, ${dariUpdatedAt} fallback updatedAt)`
    );
  }

  await disconnectDatabase();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("[backfill] gagal:", error.message);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
