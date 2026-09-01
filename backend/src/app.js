import express from "express";
import * as Sentry from "@sentry/node";
import cors from "cors";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import routes from "./routes.js";
import { corsOptions } from "./config/cors.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";

const app = express();

// Di belakang proxy (Vercel/nginx), req.ip harus diambil dari X-Forwarded-For
// — kalau tidak, express-rate-limit melihat IP proxy untuk SEMUA request dan
// melempar ERR_ERL_UNEXPECTED_X_FORWARDED_FOR. Nilai 1 = percaya satu hop
// terdekat saja; jangan `true` (percaya seluruh rantai) karena client bisa
// memalsukan header dan lolos dari rate limit.
app.set("trust proxy", 1);

// CORS dibatasi ke daftar origin di config/cors.js (FRONTEND_URL +
// CORS_ORIGINS). Di dev/autotest localhost port apa pun tetap diizinkan.
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    uptime: process.uptime(),
    env: env.NODE_ENV,
  });
});

app.use("/api/v1", routes);

app.use(notFoundHandler);

// Sentry error handler — harus SEBELUM error handler custom kita
// agar Sentry bisa menangkap error sebelum di-format jadi response JSON.
Sentry.setupExpressErrorHandler(app);

app.use(errorHandler);

export default app;
