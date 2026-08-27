import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import UserModel from "../src/modules/auth/user.model.js";
import { buatUserDanToken, buatUser } from "./helpers.js";
import { ROLES } from "../src/modules/auth/auth.constant.js";

const URL = "/api/v1/users";

/**
 * Test API manajemen user (khusus ADMIN).
 *
 * Fokus utama, selain CRUD biasa, adalah tiga pengaman di service yang
 * tidak boleh bisa dilewati lewat HTTP:
 *   - admin tidak bisa menonaktifkan/menghapus/menurunkan role dirinya
 *   - sistem tidak boleh kehilangan admin aktif terakhir
 *   - reset password punya jalur sendiri, terpisah dari edit user
 */
describe("User API", () => {
  let admin; // { user, token }
  let designer;

  beforeAll(async () => {
    await UserModel.syncIndexes();
  });

  beforeEach(async () => {
    admin = await buatUserDanToken(request, app, {
      name: "Administrator",
      username: "admin",
      email: "admin@rcfprint.com",
      password: "admin123",
      role: ROLES.ADMIN,
    });

    designer = await buatUserDanToken(request, app, {
      name: "Desainer",
      username: "desainer",
      email: "desainer@rcfprint.com",
      password: "desain123",
      role: ROLES.DESIGNER,
    });
  });

  const sebagai = (token) => ({
    post: (body) =>
      request(app).post(URL).set("Authorization", `Bearer ${token}`).send(body),
    get: (path = "") =>
      request(app).get(`${URL}${path}`).set("Authorization", `Bearer ${token}`),
    patch: (path, body) =>
      request(app)
        .patch(`${URL}${path}`)
        .set("Authorization", `Bearer ${token}`)
        .send(body),
    delete: (id) =>
      request(app).delete(`${URL}/${id}`).set("Authorization", `Bearer ${token}`),
  });

  // ---------------------------------------------------------------------------
  describe("Proteksi role", () => {
    it("menolak akses tanpa token dengan 401", async () => {
      const res = await request(app).get(URL);
      expect(res.status).toBe(401);
    });

    it("menolak role non-admin dengan 403", async () => {
      const res = await sebagai(designer.token).get();
      expect(res.status).toBe(403);
    });

    it("mengizinkan admin melihat daftar user", async () => {
      const res = await sebagai(admin.token).get();
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  describe("POST /users", () => {
    it("membuat user baru", async () => {
      const res = await sebagai(admin.token).post({
        name: "Petugas Produksi",
        username: "produksi1",
        email: "produksi1@rcfprint.com",
        password: "rahasia123",
        role: ROLES.PRODUKSI,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.username).toBe("produksi1");
      expect(res.body.data.role).toBe(ROLES.PRODUKSI);
      // isActive default true dari model
      expect(res.body.data.isActive).toBe(true);
    });

    it("tidak pernah mengembalikan password di response", async () => {
      const res = await sebagai(admin.token).post({
        name: "Petugas Packing",
        username: "packing1",
        email: "packing1@rcfprint.com",
        password: "rahasia123",
        role: ROLES.PACKING,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.password).toBeUndefined();

      // pastikan juga benar-benar di-hash di database, bukan disimpan polos
      const tersimpan = await UserModel.findById(res.body.data._id).select(
        "+password"
      );
      expect(tersimpan.password).not.toBe("rahasia123");
    });

    it("menormalkan username & email ke lowercase", async () => {
      const res = await sebagai(admin.token).post({
        name: "Huruf Besar",
        username: "KaptenKapital",
        email: "KAPITAL@rcfprint.com",
        password: "rahasia123",
        role: ROLES.DESIGNER,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.username).toBe("kaptenkapital");
      expect(res.body.data.email).toBe("kapital@rcfprint.com");
    });

    it("menolak username yang sudah dipakai dan menyebut fieldnya", async () => {
      const res = await sebagai(admin.token).post({
        name: "Admin Kembar",
        username: "admin", // sudah ada dari beforeEach
        email: "lain@rcfprint.com",
        password: "rahasia123",
        role: ROLES.ADMIN,
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("Username");
    });

    it("menolak email yang sudah dipakai dan menyebut fieldnya", async () => {
      const res = await sebagai(admin.token).post({
        name: "Email Kembar",
        username: "userbaru",
        email: "admin@rcfprint.com", // sudah ada
        password: "rahasia123",
        role: ROLES.ADMIN,
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("Email");
    });

    it("menolak role yang tidak dikenal", async () => {
      const res = await sebagai(admin.token).post({
        name: "Role Aneh",
        username: "rolealien",
        email: "alien@rcfprint.com",
        password: "rahasia123",
        role: "SUPERBOSS",
      });

      expect(res.status).toBe(400);
      expect(res.body.errors.join(" ")).toContain("Role harus salah satu");
    });

    it("menolak field wajib yang kosong", async () => {
      const res = await sebagai(admin.token).post({});

      expect(res.status).toBe(400);
      const pesan = res.body.errors.join(" ");
      expect(pesan).toContain("Nama wajib diisi");
      expect(pesan).toContain("Username wajib diisi");
      expect(pesan).toContain("Email wajib diisi");
      expect(pesan).toContain("Password wajib diisi");
      expect(pesan).toContain("Role wajib diisi");
    });

    it("menolak password di bawah 6 karakter", async () => {
      const res = await sebagai(admin.token).post({
        name: "Pendek",
        username: "pendek",
        email: "pendek@rcfprint.com",
        password: "abc",
        role: ROLES.PACKING,
      });

      expect(res.status).toBe(400);
      expect(res.body.errors.join(" ")).toContain("Password minimal 6 karakter");
    });

    it("mengabaikan field asing (stripUnknown)", async () => {
      const res = await sebagai(admin.token).post({
        name: "Selundup",
        username: "selundup",
        email: "selundup@rcfprint.com",
        password: "rahasia123",
        role: ROLES.PACKING,
        _id: "64b7f0000000000000000000",
        totalOrder: 999,
      });

      expect(res.status).toBe(201);
      expect(res.body.data._id).not.toBe("64b7f0000000000000000000");
      expect(res.body.data.totalOrder).toBeUndefined();
    });

    it("bisa membuat user langsung nonaktif kalau isActive:false dikirim", async () => {
      const res = await sebagai(admin.token).post({
        name: "Belum Aktif",
        username: "nonaktif",
        email: "nonaktif@rcfprint.com",
        password: "rahasia123",
        role: ROLES.PRODUKSI,
        isActive: false,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.isActive).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  describe("GET /users", () => {
    it("mencari berdasarkan nama, username, atau email", async () => {
      await buatUser({
        name: "Citra Dewi",
        username: "citra",
        email: "citra@rcfprint.com",
        role: ROLES.DESIGNER,
      });

      const res = await sebagai(admin.token).get("?search=citra");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].username).toBe("citra");
    });

    it("memfilter berdasarkan role", async () => {
      const res = await sebagai(admin.token).get(`?role=${ROLES.DESIGNER}`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((u) => u.role === ROLES.DESIGNER)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("memfilter berdasarkan isActive=false", async () => {
      await buatUser({
        name: "Mantan Karyawan",
        username: "mantan",
        email: "mantan@rcfprint.com",
        role: ROLES.PACKING,
        isActive: false,
      });

      const res = await sebagai(admin.token).get("?isActive=false");
      expect(res.status).toBe(200);
      expect(res.body.data.every((u) => u.isActive === false)).toBe(true);
      expect(res.body.data.some((u) => u.username === "mantan")).toBe(true);
    });

    it("mengembalikan metadata paginasi", async () => {
      const res = await sebagai(admin.token).get("?limit=1&page=1");
      expect(res.status).toBe(200);
      expect(res.body.pagination).toMatchObject({ page: 1, limit: 1 });
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
      expect(res.body.data).toHaveLength(1);
    });

    it("menolak limit di atas 100", async () => {
      const res = await sebagai(admin.token).get("?limit=500");
      expect(res.status).toBe(400);
      expect(res.body.errors.join(" ")).toContain("limit maksimal 100");
    });
  });

  // ---------------------------------------------------------------------------
  describe("GET /users/:id", () => {
    it("mengembalikan satu user", async () => {
      const res = await sebagai(admin.token).get(`/${designer.user._id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.username).toBe("desainer");
      expect(res.body.data.password).toBeUndefined();
    });

    it("404 untuk id yang tidak ada", async () => {
      const res = await sebagai(admin.token).get(
        "/64b7f0000000000000000000"
      );
      expect(res.status).toBe(404);
    });

    it("400 untuk id yang bukan ObjectId", async () => {
      const res = await sebagai(admin.token).get("/bukan-id");
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  describe("PATCH /users/:id", () => {
    it("mengubah nama user lain", async () => {
      const res = await sebagai(admin.token).patch(`/${designer.user._id}`, {
        name: "Desainer Senior",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Desainer Senior");
    });

    it("mengubah role user lain", async () => {
      const res = await sebagai(admin.token).patch(`/${designer.user._id}`, {
        role: ROLES.PRODUKSI,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe(ROLES.PRODUKSI);
    });

    it("menonaktifkan user lain", async () => {
      const res = await sebagai(admin.token).patch(`/${designer.user._id}`, {
        isActive: false,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it("menolak username yang bentrok dengan user lain", async () => {
      const res = await sebagai(admin.token).patch(`/${designer.user._id}`, {
        username: "admin",
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("Username");
    });

    it("menolak body kosong", async () => {
      const res = await sebagai(admin.token).patch(
        `/${designer.user._id}`,
        {}
      );
      expect(res.status).toBe(400);
      expect(res.body.errors.join(" ")).toContain("minimal satu field");
    });

    it("menolak field yang dikirim tapi kosong", async () => {
      const res = await sebagai(admin.token).patch(`/${designer.user._id}`, {
        name: "   ",
      });
      expect(res.status).toBe(400);
      expect(res.body.errors.join(" ")).toContain("tidak boleh kosong");
    });

    describe("pengaman diri sendiri & admin terakhir", () => {
      it("melarang admin menonaktifkan akun sendiri", async () => {
        const res = await sebagai(admin.token).patch(`/${admin.user._id}`, {
          isActive: false,
        });

        expect(res.status).toBe(403);
        expect(res.body.message).toContain("sendiri");

        const tetap = await UserModel.findById(admin.user._id);
        expect(tetap.isActive).toBe(true);
      });

      it("melarang admin mengubah role sendiri", async () => {
        const res = await sebagai(admin.token).patch(`/${admin.user._id}`, {
          role: ROLES.PACKING,
        });

        expect(res.status).toBe(403);
        expect(res.body.message).toContain("sendiri");
      });

      it("melarang menurunkan role admin aktif terakhir", async () => {
        // Pelaku = admin aktif yang punya token sah. Target = admin lain.
        const pelaku = await buatUserDanToken(request, app, {
          name: "Admin Pelaku",
          username: "adminpelaku",
          email: "adminpelaku@rcfprint.com",
          password: "rahasia123",
          role: ROLES.ADMIN,
        });

        // Nonaktifkan SEMUA admin lain selain `admin` (target) supaya `admin`
        // menjadi admin aktif TERAKHIR. Pelaku dinonaktifkan langsung di DB;
        // token yang sudah terbit tetap sah (authenticate hanya baca token),
        // jadi ia masih boleh memanggil endpoint — tapi guard harus menahannya.
        await UserModel.updateOne(
          { _id: pelaku.user._id },
          { isActive: false }
        );
        await UserModel.deleteOne({ _id: designer.user._id });

        const res = await sebagai(pelaku.token).patch(`/${admin.user._id}`, {
          role: ROLES.DESIGNER,
        });

        expect(res.status).toBe(409);
        expect(res.body.message).toContain("admin aktif terakhir");

        const tetap = await UserModel.findById(admin.user._id);
        expect(tetap.role).toBe(ROLES.ADMIN);
      });

      it("melarang menonaktifkan admin aktif terakhir", async () => {
        const pelaku = await buatUserDanToken(request, app, {
          name: "Admin Pelaku",
          username: "adminpelaku",
          email: "adminpelaku@rcfprint.com",
          password: "rahasia123",
          role: ROLES.ADMIN,
        });

        // Jadikan `admin` satu-satunya admin aktif (pelaku dinonaktifkan,
        // token tetap sah).
        await UserModel.updateOne(
          { _id: pelaku.user._id },
          { isActive: false }
        );

        const res = await sebagai(pelaku.token).patch(`/${admin.user._id}`, {
          isActive: false,
        });

        expect(res.status).toBe(409);
        expect(res.body.message).toContain("admin aktif terakhir");

        const tetap = await UserModel.findById(admin.user._id);
        expect(tetap.isActive).toBe(true);
      });
    });
  });

  // ---------------------------------------------------------------------------
  describe("PATCH /users/:id/reset-password", () => {
    it("mengganti password user dan user bisa login dengan yang baru", async () => {
      const target = await buatUser({
        name: "Lupa Password",
        username: "lupa",
        email: "lupa@rcfprint.com",
        role: ROLES.PRODUKSI,
      });

      const res = await sebagai(admin.token).patch(
        `/${target.user._id}/reset-password`,
        { newPassword: "passwordbaru123" }
      );
      expect(res.status).toBe(200);

      // password lama tidak berlaku
      const gagal = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: "lupa", password: target.passwordMentah });
      expect(gagal.status).toBe(401);

      // password baru berlaku
      const sukses = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: "lupa", password: "passwordbaru123" });
      expect(sukses.status).toBe(200);
      expect(sukses.body.data.token).toBeTruthy();
    });

    it("menolak password baru di bawah 6 karakter", async () => {
      const res = await sebagai(admin.token).patch(
        `/${designer.user._id}/reset-password`,
        { newPassword: "abc" }
      );
      expect(res.status).toBe(400);
      expect(res.body.errors.join(" ")).toContain("minimal 6 karakter");
    });

    it("404 untuk user yang tidak ada", async () => {
      const res = await sebagai(admin.token).patch(
        "/64b7f0000000000000000000/reset-password",
        { newPassword: "passwordbaru123" }
      );
      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  describe("DELETE /users/:id", () => {
    it("menghapus user lain", async () => {
      const res = await sebagai(admin.token).delete(designer.user._id);
      expect(res.status).toBe(200);
      expect(await UserModel.findById(designer.user._id)).toBeNull();
    });

    it("melarang admin menghapus akun sendiri", async () => {
      const res = await sebagai(admin.token).delete(admin.user._id);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain("sendiri");
      expect(await UserModel.findById(admin.user._id)).not.toBeNull();
    });

    it("melarang menghapus admin aktif terakhir", async () => {
      // Pelaku admin dengan token sah, tapi dinonaktifkan di DB sehingga
      // `admin` (beforeEach) jadi admin aktif terakhir. designer dihapus
      // supaya tidak ada admin lain yang aktif.
      const pelaku = await buatUserDanToken(request, app, {
        name: "Admin Penghapus",
        username: "adminhapus",
        email: "adminhapus@rcfprint.com",
        password: "rahasia123",
        role: ROLES.ADMIN,
      });

      await UserModel.updateOne({ _id: pelaku.user._id }, { isActive: false });

      const res = await sebagai(pelaku.token).delete(admin.user._id);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("admin aktif terakhir");
      expect(await UserModel.findById(admin.user._id)).not.toBeNull();
    });

    it("404 untuk user yang tidak ada", async () => {
      const res = await sebagai(admin.token).delete(
        "64b7f0000000000000000000"
      );
      expect(res.status).toBe(404);
    });
  });
});
