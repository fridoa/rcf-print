import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { buatUser } from "./helpers.js";
import { ROLES } from "../src/modules/auth/auth.constant.js";

describe("POST /api/v1/auth/login", () => {
  beforeEach(async () => {
    await buatUser({
      name: "Administrator",
      username: "admin",
      email: "admin@rcfprint.com",
      password: "admin123",
      role: ROLES.ADMIN,
    });
  });

  it("berhasil login dengan username", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "admin", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.username).toBe("admin");
  });

  it("berhasil login dengan email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "admin@rcfprint.com", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it("identifier huruf besar tetap diterima (dinormalkan ke lowercase)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "ADMIN@RCFPRINT.COM", password: "admin123" });

    expect(res.status).toBe(200);
  });

  it("tidak mengembalikan password di response", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "admin", password: "admin123" });

    expect(res.body.data.user.password).toBeUndefined();
  });

  it("menolak password salah dengan 401", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "admin", password: "salah" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("menolak user tidak terdaftar dengan pesan yang sama seperti password salah", async () => {
    const salahPassword = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "admin", password: "salah" });

    const userTidakAda = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "tidakada", password: "apapun" });

    expect(userTidakAda.status).toBe(401);
    // pesan harus identik supaya tidak membocorkan user mana yang terdaftar
    expect(userTidakAda.body.message).toBe(salahPassword.body.message);
  });

  it("menolak user yang tidak aktif dengan 403", async () => {
    await buatUser({
      name: "Nonaktif",
      username: "nonaktif",
      email: "nonaktif@rcfprint.com",
      password: "rahasia123",
      isActive: false,
    });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "nonaktif", password: "rahasia123" });

    expect(res.status).toBe(403);
  });

  it("menolak body kosong dengan 400 dan daftar error", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({});

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeInstanceOf(Array);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it("menolak password kosong dengan 400", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "admin" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/auth/me", () => {
  let token;

  beforeEach(async () => {
    await buatUser({
      name: "Administrator",
      username: "admin",
      email: "admin@rcfprint.com",
      password: "admin123",
    });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "admin", password: "admin123" });

    token = res.body.data.token;
  });

  it("mengembalikan profil user saat token valid", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe("admin");
    expect(res.body.data.email).toBe("admin@rcfprint.com");
    expect(res.body.data.password).toBeUndefined();
  });

  it("menolak request tanpa header Authorization dengan 401", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("menolak token yang tidak valid dengan 401", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer token.ngawur.xxx");

    expect(res.status).toBe(401);
  });

  it("menolak skema selain Bearer dengan 401", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Basic ${token}`);

    expect(res.status).toBe(401);
  });
});
