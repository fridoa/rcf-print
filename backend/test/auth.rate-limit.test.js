import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import UserModel from "../src/modules/auth/user.model.js";
import { buatUser } from "./helpers.js";
import { emailAutotest } from "../src/utils/mails/mail.js";
import {
  loginLimiter,
  forgotPasswordLimiter,
  otpLimiter,
} from "../src/middlewares/rateLimit.middleware.js";

/**
 * Rate limiting lupa katasandi.
 *
 * Dua lapis:
 *  1. Per-IP (express-rate-limit) — TIDAK diuji lewat HTTP di sini karena
 *     sengaja di-skip di autotest (kalau aktif, test suite saling blokir).
 *     Yang diuji: ketiganya passthrough di autotest (next() dipanggil).
 *  2. Per-email per jam di service — ini yang diuji penuh: penyerang dari
 *     banyak IP pun tetap terbatas untuk satu inbox korban.
 */

const ambilKirim = () => emailAutotest();

describe("Limiter per-IP di-skip di autotest", () => {
  it("loginLimiter / forgotPasswordLimiter / otpLimiter memanggil next()", async () => {
    for (const limiter of [loginLimiter, forgotPasswordLimiter, otpLimiter]) {
      let nextDipanggil = false;
      await new Promise((resolve) =>
        limiter({}, { end: resolve }, () => {
          nextDipanggil = true;
          resolve();
        })
      );
      expect(nextDipanggil).toBe(true);
    }
  });
});

describe("Batas forgot-password per email per jam", () => {
  beforeEach(() => {
    ambilKirim().splice(0);
  });

  it("permintaan ke-4 dalam satu jam: tetap 200 generik tapi tidak mengirim email", async () => {
    await buatUser({ email: "budi@rcfprint.com", username: "budi" });

    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "budi@rcfprint.com" });
      expect(res.status).toBe(200);
    }
    expect(ambilKirim()).toHaveLength(3);

    // ke-4: ditolak diam-diam
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "budi@rcfprint.com" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(ambilKirim()).toHaveLength(3); // tidak ada email baru

    // counter di DB terkunci di batas
    const user = await UserModel.findOne({ email: "budi@rcfprint.com" }).select(
      "+forgot_request_count"
    );
    expect(user.forgot_request_count).toBe(3);
  });

  it("window bergulir: setelah 1 jam, permintaan diterima lagi", async () => {
    const { user } = await buatUser({
      email: "budi@rcfprint.com",
      username: "budi",
    });

    // habiskan jatah
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "budi@rcfprint.com" });
    }

    // mundurkan jam window seolah sudah lewat satu jam
    user.forgot_window_started_at = new Date(Date.now() - 61 * 60 * 1000);
    await user.save();

    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "budi@rcfprint.com" });

    expect(res.status).toBe(200);
    expect(ambilKirim()).toHaveLength(4); // email baru terkirim, counter reset
  });

  it("batas per email tidak memengaruhi email lain", async () => {
    await buatUser({ email: "budi@rcfprint.com", username: "budi" });
    await buatUser({ email: "sinta@rcfprint.com", username: "sinta" });

    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "budi@rcfprint.com" });
    }

    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "sinta@rcfprint.com" });

    expect(res.status).toBe(200);
    expect(ambilKirim()).toHaveLength(4); // sinta tetap dilayani
  });
});
