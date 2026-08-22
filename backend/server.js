import app from "./src/app.js";
import { env } from "./src/config/env.js";
import { connectDatabase, disconnectDatabase } from "./src/config/database.js";

const start = async () => {
  try {
    await connectDatabase();

    const server = app.listen(env.PORT, () => {
      console.log(`[server] jalan di http://localhost:${env.PORT} (${env.NODE_ENV})`);
    });

    const shutdown = (signal) => {
      console.log(`\n[server] ${signal} diterima, menutup server...`);
      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("[server] gagal start:", error.message);
    process.exit(1);
  }
};

start();
