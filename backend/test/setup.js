import dotenv from "dotenv";
import mongoose from "mongoose";
import { beforeAll, afterAll, afterEach } from "vitest";

// .env.autotest wajib ada dan harus menunjuk database *_autotest
dotenv.config({ path: ".env.autotest", override: true });

if (process.env.APP_ENV !== "autotest") {
  throw new Error(
    `Test harus dijalankan dengan APP_ENV=autotest (sekarang "${process.env.APP_ENV}"). ` +
      "Periksa file .env.autotest — lihat .env.autotest.example"
  );
}

beforeAll(async () => {
  const { connectDatabase } = await import("../src/config/database.js");
  const { env } = await import("../src/config/env.js");

  await connectDatabase();

  // pagar terakhir: jangan pernah menjalankan test di database lain
  if (!env.DATABASE_NAME.endsWith("_autotest")) {
    throw new Error(
      `Database test bernama "${env.DATABASE_NAME}" — tidak berakhiran _autotest. ` +
        "Test dibatalkan supaya tidak menghapus data yang salah."
    );
  }
});

/** Kosongkan semua collection setelah tiap test supaya tidak saling bocor. */
afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.close();
});
