import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import UserModel from "../src/modules/auth/user.model.js";
import { buatUser } from "./helpers.js";
import { hashSha256 } from "../src/utils/otp.js";
import { emailAutotest } from "../src/utils/mails/mail.js";

/**
 * Lupa katasandi — alur OTP + token reset.
 *
 * Di autotest, mail adapter memakai implementasi palsu: email tidak benar-
 * benar terkirim, tapi isinya (OTP + token mentah) tercatat di
 * `emailAutotest()` sehingga test bisa mengambilnya seperti user membaca
 * inbox-nya.
 */

const ambilEmailTerakhir = () => {
  const kirim = emailAutotest();
  if (kirim.length === 0) throw new Error("tidak ada email autotest terkirim");
  return kirim[kirim.length - 1];
};

/** Ambil OTP & token mentah dari email palsu autotest. */
const ambilOtpDanToken = (mail) => {
  const otp = mail.html.match(/>\s*(\d{6})\s*</)?.[1];
  const token = (mail.html.match(/token=([a-f0-9]{64})/) || [])[1];
  if (!otp || !token) throw new Error("OTP/token tidak ditemukan di email");
  return { otp, token };
};

describe("POST /api/v1/auth/forgot-password", () => {
  beforeEach(() => emailAutotest().splice(0));

  it("mengirim email reset saat email terdaftar", async () => {
    await buatUser({ email: "budi@rcfprint.com", username: "budi" });

    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "budi@rcfprint.com" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const mail = ambilEmailTerakhir();
    expect(mail.to).toBe("budi@rcfprint.com");
    const { otp, token } = ambilOtpDanToken(mail);
    expect(otp).toMatch(/^\d{6}$/);
    expect(token).toMatch(/^[a-f0-9]{64}$/);

    // DB menyimpan hash, bukan nilai mentah
    const user = await UserModel.findOne({ email: "budi@rcfprint.com" }).select(
      "+otp_hash +reset_token_hash"
    );
    expect(user.otp_hash).toBe(hashSha256(otp));
    expect(user.reset_token_hash).toBe(hashSha256(token));
  });

  it("tetap 200 untuk email tidak terdaftar (anti enumeration)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "hantu@tidakada.com" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(emailAutotest()).toHaveLength(0); // tidak ada email terkirim
  });

  it("menolak email kosong dengan 400", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "" });

    expect(res.status).toBe(400);
  });

  it("permintaan kedua menghasilkan OTP/token baru (yang lama hangus)", async () => {
    await buatUser({ email: "budi@rcfprint.com", username: "budi" });

    await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "budi@rcfprint.com" });
    const pertama = ambilOtpDanToken(ambilEmailTerakhir());

    await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "budi@rcfprint.com" });
    const kedua = ambilOtpDanToken(ambilEmailTerakhir());

    expect(kedua.otp).not.toBe(pertama.otp);
    expect(kedua.token).not.toBe(pertama.token);
  });
});

describe("POST /api/v1/auth/verify-otp", () => {
  beforeEach(() => emailAutotest().splice(0));

  it("menerima OTP yang benar dan mengembalikan token reset baru", async () => {
    await buatUser({ email: "budi@rcfprint.com", username: "budi" });
    await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "budi@rcfprint.com" });
    const { otp, token: tokenLama } = ambilOtpDanToken(ambilEmailTerakhir());

    const res = await request(app)
      .post("/api/v1/auth/verify-otp")
      .send({ email: "budi@rcfprint.com", otp });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Kode OTP valid");
    // token baru diterbitkan, berbeda dari yang ada di email
    expect(res.body.data.resetToken).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.data.resetToken).not.toBe(tokenLama);

    // token baru bisa dipakai reset
    const reset = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: res.body.data.resetToken, newPassword: "passwordbaru123" });
    expect(reset.status).toBe(200);

    // token dari link email lama hangus (ditimpa)
    const resetLama = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: tokenLama, newPassword: "lagi12345" });
    expect(resetLama.status).toBe(400);
  });

  it("OTP sekali pakai: dipakai dua kali ditolak", async () => {
    await buatUser({ email: "budi@rcfprint.com", username: "budi" });
    await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "budi@rcfprint.com" });
    const { otp } = ambilOtpDanToken(ambilEmailTerakhir());

    await request(app)
      .post("/api/v1/auth/verify-otp")
      .send({ email: "budi@rcfprint.com", otp });

    const kedua = await request(app)
      .post("/api/v1/auth/verify-otp")
      .send({ email: "budi@rcfprint.com", otp });

    expect(kedua.status).toBe(400);
  });

  it("menolak OTP salah dengan pesan seragam", async () => {
    await buatUser({ email: "budi@rcfprint.com", username: "budi" });

    const res = await request(app)
      .post("/api/v1/auth/verify-otp")
      .send({ email: "budi@rcfprint.com", otp: "000000" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Kode OTP salah atau kedaluwarsa");
  });

  it("menolak OTP kedaluwarsa", async () => {
    const { user } = await buatUser({
      email: "budi@rcfprint.com",
      username: "budi",
    });
    user.otp_hash = hashSha256("111222");
    user.otp_expires_at = new Date(Date.now() - 60_000); // sudah lewat
    await user.save();

    const res = await request(app)
      .post("/api/v1/auth/verify-otp")
      .send({ email: "budi@rcfprint.com", otp: "111222" });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/auth/reset-password", () => {
  beforeEach(() => emailAutotest().splice(0));

  const mintaReset = async () => {
    await buatUser({ email: "budi@rcfprint.com", username: "budi" });
    await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "budi@rcfprint.com" });
    return ambilOtpDanToken(ambilEmailTerakhir());
  };

  it("reset password dengan token dari email, lalu bisa login dengan password baru", async () => {
    const { token } = await mintaReset();

    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token, newPassword: "passwordbaru123" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Password berhasil direset, silakan login");

    // password lama tidak berlaku, yang baru bisa dipakai
    const loginLama = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "budi", password: "rahasia123" });
    expect(loginLama.status).toBe(401);

    const loginBaru = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "budi", password: "passwordbaru123" });
    expect(loginBaru.status).toBe(200);
  });

  it("token single-use: dipakai dua kali ditolak", async () => {
    const { token } = await mintaReset();

    await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token, newPassword: "passwordbaru123" });

    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token, newPassword: "lagilagi123" });

    expect(res.status).toBe(400);
  });

  it("menolak token yang tidak ada / kedaluwarsa", async () => {
    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: "f".repeat(64), newPassword: "passwordbaru123" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Token reset salah atau kedaluwarsa");
  });

  it("menolak token valid milik akun nonaktif", async () => {
    const { user } = await buatUser({
      email: "budi@rcfprint.com",
      username: "budi",
    });
    await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "budi@rcfprint.com" });
    const { token } = ambilOtpDanToken(ambilEmailTerakhir());

    user.isActive = false;
    await user.save();

    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token, newPassword: "passwordbaru123" });

    expect(res.status).toBe(403);
  });

  it("menolak password baru terlalu pendek", async () => {
    const { token } = await mintaReset();

    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token, newPassword: "abc" });

    expect(res.status).toBe(400);
  });
});
