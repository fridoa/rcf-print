import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import routes from "./routes.js";
import { corsOptions } from "./config/cors.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";

const app = express();

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
app.use(errorHandler);

export default app;
