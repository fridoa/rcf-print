import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import CustomerModel from "../src/modules/customers/customer.model.js";
import { buatUserDanToken, buatCustomer } from "./helpers.js";
import { ROLES } from "../src/modules/auth/auth.constant.js";

const URL = "/api/v1/customers";

describe("Customer API", () => {
  let tokenAdmin;
  let tokenDesigner;

  beforeAll(async () => {
    await CustomerModel.syncIndexes();
  });

  beforeEach(async () => {
    ({ token: tokenAdmin } = await buatUserDanToken(request, app, {
      name: "Administrator",
      username: "admin",
      email: "admin@rcfprint.com",
      password: "admin123",
      role: ROLES.ADMIN,
    }));

    ({ token: tokenDesigner } = await buatUserDanToken(request, app, {
      name: "Desainer",
      username: "desainer",
      email: "desainer@rcfprint.com",
      password: "desain123",
      role: ROLES.DESIGNER,
    }));
  });

  const sebagai = (token) => ({
    post: (body) =>
      request(app).post(URL).set("Authorization", `Bearer ${token}`).send(body),
    get: (path = "") =>
      request(app).get(`${URL}${path}`).set("Authorization", `Bearer ${token}`),
    patch: (id, body) =>
      request(app)
        .patch(`${URL}/${id}`)
        .set("Authorization", `Bearer ${token}`)
        .send(body),
    delete: (id) =>
      request(app)
        .delete(`${URL}/${id}`)
        .set("Authorization", `Bearer ${token}`),
  });

  describe("POST /customers", () => {
    it("membuat pelanggan dan menormalkan nomor ke format 62", async () => {
      const res = await sebagai(tokenAdmin).post({
        name: "Budi Santoso",
        whatsapp: "0812-3456-7890",
        note: "Langganan kaos komunitas",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Budi Santoso");
      expect(res.body.data.whatsapp).toBe("6281234567890");
      expect(res.body.data.note).toBe("Langganan kaos komunitas");

      const tersimpan = await CustomerModel.findById(res.body.data._id);
      expect(tersimpan.whatsapp).toBe("6281234567890");
    });

    it("menolak nomor yang sudah dipakai dan menyebut nama pemiliknya", async () => {
      await buatCustomer({ name: "Budi Santoso", whatsapp: "081234567890" });

      const res = await sebagai(tokenAdmin).post({
        name: "Budi Kedua",
        // format beda, nomor sama
        whatsapp: "+62 812 3456 7890",
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("Budi Santoso");
      expect(await CustomerModel.countDocuments()).toBe(1);
    });

    it("menolak nomor yang tidak valid", async () => {
      const res = await sebagai(tokenAdmin).post({
        name: "Budi Santoso",
        whatsapp: "12345",
      });

      expect(res.status).toBe(400);
      expect(res.body.errors.join(" ")).toContain("Nomor WhatsApp tidak valid");
    });

    it("menolak body tanpa nama dan nomor", async () => {
      const res = await sebagai(tokenAdmin).post({});

      expect(res.status).toBe(400);
      const pesan = res.body.errors.join(" ");
      expect(pesan).toContain("Nama pelanggan wajib diisi");
      expect(pesan).toContain("Nomor WhatsApp wajib diisi");
    });

    it("mengabaikan field asing yang diselundupkan (stripUnknown)", async () => {
      const res = await sebagai(tokenAdmin).post({
        name: "Budi Santoso",
        whatsapp: "081234567890",
        totalOrder: 999,
        _id: "64b7f0000000000000000000",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.totalOrder).toBeUndefined();
      expect(res.body.data._id).not.toBe("64b7f0000000000000000000");
    });

    it("menolak role non-admin dengan 403", async () => {
      const res = await sebagai(tokenDesigner).post({
        name: "Budi Santoso",
        whatsapp: "081234567890",
      });

      expect(res.status).toBe(403);
      expect(await CustomerModel.countDocuments()).toBe(0);
    });

    it("menolak request tanpa token dengan 401", async () => {
      const res = await request(app)
        .post(URL)
        .send({ name: "Budi Santoso", whatsapp: "081234567890" });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /customers", () => {
    beforeEach(async () => {
      await buatCustomer({ name: "Budi Santoso", whatsapp: "081234567890" });
      await buatCustomer({ name: "Citra Dewi", whatsapp: "081298765432" });
      await buatCustomer({ name: "Agus Salim", whatsapp: "085711112222" });
    });

    it("mengembalikan daftar pelanggan beserta info paginasi", async () => {
      const res = await sebagai(tokenAdmin).get();

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
      });
    });

    it("mencari berdasarkan potongan nama tanpa peduli huruf besar/kecil", async () => {
      const res = await sebagai(tokenAdmin).get("?search=citra");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe("Citra Dewi");
    });

    it("mencari berdasarkan nomor yang diketik dengan awalan 0", async () => {
      const res = await sebagai(tokenAdmin).get("?search=0812987");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe("Citra Dewi");
    });

    it("memotong hasil sesuai page dan limit", async () => {
      const halaman1 = await sebagai(tokenAdmin).get("?limit=2&page=1&sort=name");
      const halaman2 = await sebagai(tokenAdmin).get("?limit=2&page=2&sort=name");

      expect(halaman1.body.data.map((c) => c.name)).toEqual([
        "Agus Salim",
        "Budi Santoso",
      ]);
      expect(halaman2.body.data.map((c) => c.name)).toEqual(["Citra Dewi"]);
      expect(halaman1.body.pagination.totalPages).toBe(2);
    });

    it("menolak limit di atas 100", async () => {
      const res = await sebagai(tokenAdmin).get("?limit=500");

      expect(res.status).toBe(400);
      expect(res.body.errors.join(" ")).toContain("limit maksimal 100");
    });

    it("menolak nilai sort yang tidak dikenal", async () => {
      const res = await sebagai(tokenAdmin).get("?sort=whatsapp");

      expect(res.status).toBe(400);
    });

    it("tidak menganggap karakter regex sebagai pola", async () => {
      const res = await sebagai(tokenAdmin).get("?search=.*");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("boleh dibaca role non-admin", async () => {
      const res = await sebagai(tokenDesigner).get();

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
    });
  });

  describe("GET /customers/:id", () => {
    it("mengembalikan satu pelanggan", async () => {
      const customer = await buatCustomer();

      const res = await sebagai(tokenAdmin).get(`/${customer._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(customer._id.toString());
    });

    it("menjawab 404 untuk id yang tidak ada", async () => {
      const res = await sebagai(tokenAdmin).get(
        "/64b7f0000000000000000000"
      );

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Pelanggan tidak ditemukan");
    });

    it("menjawab 400 untuk id yang bukan ObjectId", async () => {
      const res = await sebagai(tokenAdmin).get("/bukan-id");

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /customers/:id", () => {
    let customer;

    beforeEach(async () => {
      customer = await buatCustomer({
        name: "Budi Santoso",
        whatsapp: "081234567890",
        note: "catatan awal",
      });
    });

    it("bisa mengubah nama saja", async () => {
      const res = await sebagai(tokenAdmin).patch(customer._id, {
        name: "Budi Santoso Jaya",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Budi Santoso Jaya");
      // field lain tidak ikut berubah
      expect(res.body.data.whatsapp).toBe("6281234567890");
      expect(res.body.data.note).toBe("catatan awal");
    });

    it("bisa mengubah nomor saja dan tetap dinormalkan", async () => {
      const res = await sebagai(tokenAdmin).patch(customer._id, {
        whatsapp: "0857-1111-2222",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.whatsapp).toBe("6285711112222");
      expect(res.body.data.name).toBe("Budi Santoso");
    });

    it("boleh mengosongkan catatan", async () => {
      const res = await sebagai(tokenAdmin).patch(customer._id, { note: "" });

      expect(res.status).toBe(200);
      expect(res.body.data.note).toBe("");
    });

    it("mengirim ulang nomor sendiri tidak dianggap duplikat", async () => {
      const res = await sebagai(tokenAdmin).patch(customer._id, {
        whatsapp: "081234567890",
        name: "Budi Santoso",
      });

      expect(res.status).toBe(200);
    });

    it("menolak nomor milik pelanggan lain dengan 409", async () => {
      await buatCustomer({ name: "Citra Dewi", whatsapp: "081298765432" });

      const res = await sebagai(tokenAdmin).patch(customer._id, {
        whatsapp: "081298765432",
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("Citra Dewi");

      const tersimpan = await CustomerModel.findById(customer._id);
      expect(tersimpan.whatsapp).toBe("6281234567890");
    });

    it("menolak body kosong dengan 400", async () => {
      const res = await sebagai(tokenAdmin).patch(customer._id, {});

      expect(res.status).toBe(400);
      expect(res.body.errors.join(" ")).toContain("Kirim minimal satu field");
    });

    it("menolak nama string kosong dengan 400", async () => {
      const res = await sebagai(tokenAdmin).patch(customer._id, { name: "" });

      expect(res.status).toBe(400);

      const tersimpan = await CustomerModel.findById(customer._id);
      expect(tersimpan.name).toBe("Budi Santoso");
    });

    it("menolak role non-admin dengan 403", async () => {
      const res = await sebagai(tokenDesigner).patch(customer._id, {
        name: "Diubah Desainer",
      });

      expect(res.status).toBe(403);

      const tersimpan = await CustomerModel.findById(customer._id);
      expect(tersimpan.name).toBe("Budi Santoso");
    });

    it("menjawab 404 untuk pelanggan yang tidak ada", async () => {
      const res = await sebagai(tokenAdmin).patch("64b7f0000000000000000000", {
        name: "Tidak Ada",
      });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /customers/:id", () => {
    it("menghapus pelanggan yang belum punya order", async () => {
      const customer = await buatCustomer();

      const res = await sebagai(tokenAdmin).delete(customer._id);

      expect(res.status).toBe(200);
      expect(await CustomerModel.findById(customer._id)).toBeNull();
    });

    it("menolak menghapus pelanggan yang sudah punya order", async () => {
      const customer = await buatCustomer();

      // modul order belum ada; dokumen order dibuat langsung lewat driver
      // supaya aturan ini tetap teruji sekarang
      const { default: mongoose } = await import("mongoose");
      await mongoose.connection.collection("orders").insertOne({
        kode_order: "DTF/220826/001",
        customer_id: customer._id,
        status: "ANTRI_DESAIN",
      });

      const res = await sebagai(tokenAdmin).delete(customer._id);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("1 order");
      expect(await CustomerModel.findById(customer._id)).not.toBeNull();
    });

    it("menolak role non-admin dengan 403", async () => {
      const customer = await buatCustomer();

      const res = await sebagai(tokenDesigner).delete(customer._id);

      expect(res.status).toBe(403);
      expect(await CustomerModel.findById(customer._id)).not.toBeNull();
    });

    it("menjawab 404 untuk pelanggan yang tidak ada", async () => {
      const res = await sebagai(tokenAdmin).delete("64b7f0000000000000000000");

      expect(res.status).toBe(404);
    });
  });
});
