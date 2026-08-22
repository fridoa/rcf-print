import mongoose from "mongoose";
import { env } from "./env.js";

/**
 * Cache koneksi di globalThis.
 *
 * Di serverless (Vercel) satu instance fungsi bisa menangani banyak request,
 * dan instance baru dibuat kapan saja. Tanpa cache, setiap request memanggil
 * mongoose.connect() lagi dan jumlah koneksi ke Atlas cepat habis
 * (free tier dibatasi ~500 koneksi).
 */
const cached = globalThis.__mongoose ?? { conn: null, promise: null };
globalThis.__mongoose = cached;

export const connectDatabase = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    mongoose.set("strictQuery", true);

    cached.promise = mongoose
      .connect(env.DATABASE_URL, {
        // di serverless jangan menggantung lama — lebih baik gagal cepat
        serverSelectionTimeoutMS: 8000,
        // buffering dimatikan supaya query tidak menumpuk saat koneksi belum siap
        bufferCommands: false,
        maxPoolSize: 10,
      })
      .then((m) => {
        console.log(`[db] terhubung — database "${m.connection.name}" di ${m.connection.host}`);
        return m.connection;
      })
      .catch((err) => {
        // reset supaya percobaan berikutnya tidak memakai promise yang gagal
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

export const disconnectDatabase = async () => {
  if (!cached.conn) return;
  await mongoose.connection.close();
  cached.conn = null;
  cached.promise = null;
  console.log("[db] koneksi ditutup");
};

mongoose.connection.on("error", (err) => {
  console.error("[db] error koneksi:", err.message);
});
