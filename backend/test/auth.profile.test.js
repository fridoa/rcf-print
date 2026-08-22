import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import UserModel from "../src/modules/auth/user.model.js";
import { buatUser } from "./helpers.js";
import { ROLES } from "../src/modules/auth/auth.constant.js";

const login = (identifier, password) =>
  request(app).post("/api/v1/auth/login").send({ identifier, password });

describe("PATCH /api/v1/auth/edit-profile", () => {
  let token;

  const profilValid = {
    name: "Administrator Baru",
    username: "adminbaru",
    email: "adminbaru@rcfprint.com",
  };

  beforeEach(async () => {
    await buatUser({
      name: "Administrator",
      username: "admin",
      email: "admin@rcfprint.com",
      password: "admin123",
      role: ROLES.ADMIN,
    });

    const res = await login("admin", "admin123");
    token = res.body.data.token;
  });

  const kirim = (body, bearer = token) =>
    request(app)
      .patch("/api/v1/auth/edit-profile")
      .set("Authorization", `Bearer ${bearer}`)
      .send(body);

  it("bisa mengubah name saja tanpa mengirim field lain", async () => {
    const res = await kirim({ name: "Nama Saja Berubah" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Nama Saja Berubah");
    // field lain tidak boleh ikut berubah
    expect(res.body.data.username).toBe("admin");
    expect(res.body.data.email).toBe("admin@rcfprint.com");
  });

  it("bisa mengubah username saja", async () => {
    const res = await kirim({ username: "adminbaru" });

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe("adminbaru");
    expect(res.body.data.name).toBe("Administrator");
    expect(res.body.data.email).toBe("admin@rcfprint.com");
  });

  it("bisa mengubah email saja", async () => {
    const res = await kirim({ email: "barusaja@rcfprint.com" });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("barusaja@rcfprint.com");
    expect(res.body.data.username).toBe("admin");
  });

  it("bisa mengubah dua field sekaligus", async () => {
    const res = await kirim({ name: "Dua Field", email: "dua@rcfprint.com" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Dua Field");
    expect(res.body.data.email).toBe("dua@rcfprint.com");
    expect(res.body.data.username).toBe("admin");
  });

  it("field yang tidak dikirim tetap utuh di database", async () => {
    await kirim({ name: "Cek Database" });

    const tersimpan = await UserModel.findOne({ username: "admin" });
    expect(tersimpan.name).toBe("Cek Database");
    expect(tersimpan.email).toBe("admin@rcfprint.com");
    expect(tersimpan.role).toBe(ROLES.ADMIN);
  });

  it("berhasil memperbarui name, username, dan email sekaligus", async () => {
    const res = await kirim(profilValid);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(profilValid.name);
    expect(res.body.data.username).toBe(profilValid.username);
    expect(res.body.data.email).toBe(profilValid.email);
  });

  it("menyimpan perubahan ke database", async () => {
    await kirim(profilValid);

    const tersimpan = await UserModel.findOne({ username: "adminbaru" });
    expect(tersimpan).not.toBeNull();
    expect(tersimpan.email).toBe(profilValid.email);
  });

  it("bisa login dengan username baru setelah profil diubah", async () => {
    await kirim(profilValid);

    const res = await login("adminbaru", "admin123");
    expect(res.status).toBe(200);
  });

  it("menormalkan username dan email ke huruf kecil", async () => {
    const res = await kirim({
      name: "Administrator",
      username: "AdminBesar",
      email: "AdminBesar@RCFPrint.com",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe("adminbesar");
    expect(res.body.data.email).toBe("adminbesar@rcfprint.com");
  });

  it("tidak mengembalikan password di response", async () => {
    const res = await kirim(profilValid);
    expect(res.body.data.password).toBeUndefined();
  });

  it("boleh mengirim username & email milik sendiri tanpa dianggap duplikat", async () => {
    const res = await kirim({
      name: "Administrator",
      username: "admin",
      email: "admin@rcfprint.com",
    });

    expect(res.status).toBe(200);
  });

  it("menolak username yang sudah dipakai user lain dengan 409", async () => {
    await buatUser({
      name: "Desainer",
      username: "desainer",
      email: "desainer@rcfprint.com",
      password: "rahasia123",
      role: ROLES.DESIGNER,
    });

    const res = await kirim({ username: "desainer" });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/username/i);
  });

  it("menolak email yang sudah dipakai user lain dengan 409", async () => {
    await buatUser({
      name: "Desainer",
      username: "desainer",
      email: "desainer@rcfprint.com",
      password: "rahasia123",
    });

    const res = await kirim({ email: "desainer@rcfprint.com" });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/email/i);
  });

  it("mengabaikan role dan isActive yang diselipkan di body", async () => {
    const res = await kirim({
      ...profilValid,
      role: ROLES.ADMIN,
      isActive: false,
    });

    expect(res.status).toBe(200);

    const tersimpan = await UserModel.findOne({ username: "adminbaru" });
    expect(tersimpan.role).toBe(ROLES.ADMIN);
    expect(tersimpan.isActive).toBe(true);
  });

  it("menolak body yang hanya berisi role tanpa field profil", async () => {
    const res = await kirim({ role: ROLES.ADMIN });

    // stripUnknown membuang role, sisanya kosong → tidak ada yang diubah
    expect(res.status).toBe(400);
  });

  it("user non-admin tidak bisa menaikkan role-nya lewat endpoint ini", async () => {
    await buatUser({
      name: "Desainer",
      username: "desainer",
      email: "desainer@rcfprint.com",
      password: "rahasia123",
      role: ROLES.DESIGNER,
    });

    const resLogin = await login("desainer", "rahasia123");
    const tokenDesainer = resLogin.body.data.token;

    await kirim(
      {
        name: "Desainer",
        username: "desainer",
        email: "desainer@rcfprint.com",
        role: ROLES.ADMIN,
      },
      tokenDesainer
    );

    const tersimpan = await UserModel.findOne({ username: "desainer" });
    expect(tersimpan.role).toBe(ROLES.DESIGNER);
  });

  it("menolak email dengan format tidak valid", async () => {
    const res = await kirim({ email: "bukanemail" });
    expect(res.status).toBe(400);
  });

  it("menolak username yang mengandung tanda @", async () => {
    const res = await kirim({ username: "admin@rcfprint.com" });
    expect(res.status).toBe(400);
  });

  it("menolak username dengan spasi atau karakter aneh", async () => {
    const res = await kirim({ username: "admin baru!" });
    expect(res.status).toBe(400);
  });

  it("menolak name yang terlalu pendek", async () => {
    const res = await kirim({ name: "ab" });
    expect(res.status).toBe(400);
  });

  it("menolak field yang dikirim tapi isinya string kosong", async () => {
    const res = await kirim({ name: "" });
    expect(res.status).toBe(400);
  });

  it("menolak body kosong dengan 400 (tidak ada yang diubah)", async () => {
    const res = await kirim({});

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeInstanceOf(Array);
  });

  it("menolak request tanpa token dengan 401", async () => {
    const res = await request(app)
      .patch("/api/v1/auth/edit-profile")
      .send(profilValid);

    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/v1/auth/change-password", () => {
  let token;

  const bodyValid = {
    oldPassword: "admin123",
    newPassword: "rahasiaBaru123",
    confirmPassword: "rahasiaBaru123",
  };

  beforeEach(async () => {
    await buatUser({
      name: "Administrator",
      username: "admin",
      email: "admin@rcfprint.com",
      password: "admin123",
    });

    const res = await login("admin", "admin123");
    token = res.body.data.token;
  });

  const kirim = (body, bearer = token) =>
    request(app)
      .patch("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${bearer}`)
      .send(body);

  it("berhasil mengubah password", async () => {
    const res = await kirim(bodyValid);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("password baru bisa dipakai login", async () => {
    await kirim(bodyValid);

    const res = await login("admin", "rahasiaBaru123");
    expect(res.status).toBe(200);
  });

  it("password lama tidak bisa dipakai login lagi", async () => {
    await kirim(bodyValid);

    const res = await login("admin", "admin123");
    expect(res.status).toBe(401);
  });

  it("menyimpan password baru dalam bentuk hash, bukan teks biasa", async () => {
    await kirim(bodyValid);

    const tersimpan = await UserModel.findOne({ username: "admin" }).select("+password");
    expect(tersimpan.password).not.toBe("rahasiaBaru123");
    expect(tersimpan.password).toMatch(/^\$2[aby]\$/);
  });

  it("tidak membocorkan data user di response", async () => {
    const res = await kirim(bodyValid);
    expect(res.body.data).toBeUndefined();
  });

  it("menolak oldPassword yang salah dengan 401", async () => {
    const res = await kirim({ ...bodyValid, oldPassword: "salahbanget" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/password lama/i);
  });

  it("password tidak berubah saat oldPassword salah", async () => {
    await kirim({ ...bodyValid, oldPassword: "salahbanget" });

    const res = await login("admin", "admin123");
    expect(res.status).toBe(200);
  });

  it("menolak confirmPassword yang tidak sama dengan 400", async () => {
    const res = await kirim({
      ...bodyValid,
      confirmPassword: "bedasamasekali",
    });

    expect(res.status).toBe(400);
  });

  it("menolak newPassword yang sama dengan oldPassword", async () => {
    const res = await kirim({
      oldPassword: "admin123",
      newPassword: "admin123",
      confirmPassword: "admin123",
    });

    expect(res.status).toBe(400);
  });

  it("menolak newPassword yang kurang dari 6 karakter", async () => {
    const res = await kirim({
      oldPassword: "admin123",
      newPassword: "abc",
      confirmPassword: "abc",
    });

    expect(res.status).toBe(400);
  });

  it("menolak body kosong dengan 400", async () => {
    const res = await kirim({});

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeInstanceOf(Array);
  });

  it("menolak request tanpa token dengan 401", async () => {
    const res = await request(app)
      .patch("/api/v1/auth/change-password")
      .send(bodyValid);

    expect(res.status).toBe(401);
  });
});
