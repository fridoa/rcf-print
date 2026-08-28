import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import UserModel from "../src/modules/auth/user.model.js";
import { ROLES } from "../src/modules/auth/auth.constant.js";
import { env } from "../src/config/env.js";

const SEED = {
  name: "Administrator",
  username: "admin",
  email: "admin@rcfprint.com",
  password: "admin123",
  role: ROLES.ADMIN,
};

const run = async () => {
  await connectDatabase();
  console.log(`[seed] environment: ${env.APP_ENV} — database: ${env.DATABASE_NAME}`);

  const existing = await UserModel.findOne({
    $or: [{ username: SEED.username }, { email: SEED.email }],
  });

  if (existing) {
    console.log(`[seed] user "${existing.username}" sudah ada, tidak dibuat ulang`);
  } else {
    const user = await UserModel.create(SEED);
    console.log(`[seed] user admin dibuat: ${user.username} / ${SEED.password}`);
    console.log("[seed] GANTI password ini sebelum dipakai di production");
  }

  await disconnectDatabase();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("[seed] gagal:", error.message);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
