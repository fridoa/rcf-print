import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import OrderModel from "../src/modules/orders/order.model.js";
import CounterModel from "../src/modules/orders/counter.model.js";
import StatusLogModel from "../src/modules/orders/status-log.model.js";
import { STATUS, JENIS } from "../src/modules/orders/order.constant.js";
import { ROLES } from "../src/modules/auth/auth.constant.js";
import { buatUserDanToken, buatCustomer, buatDesign } from "./helpers.js";

const URL = "/api/v1/orders";

describe("Order API", () => {
  let tokenAdmin;
  let adminUser;
  let tokenDesigner;
  let tokenProduksi;
  let tokenPacking;
  let customer;
  let designs; // desain milik `customer`, dipakai saat membuat order

  beforeAll(async () => {
    await OrderModel.syncIndexes();
  });

  beforeEach(async () => {
    ({ token: tokenAdmin, user: adminUser } = await buatUserDanToken(
      request,
      app,
      {
        name: "Administrator",
        username: "admin",
        email: "admin@rcfprint.com",
        password: "admin123",
        role: ROLES.ADMIN,
      }
    ));
    ({ token: tokenDesigner } = await buatUserDanToken(request, app, {
      name: "Desainer",
      username: "desainer",
      email: "desainer@rcfprint.com",
      password: "desain123",
      role: ROLES.DESIGNER,
    }));
    ({ token: tokenProduksi } = await buatUserDanToken(request, app, {
      name: "Operator",
      username: "produksi",
      email: "produksi@rcfprint.com",
      password: "produksi123",
      role: ROLES.PRODUKSI,
    }));
    ({ token: tokenPacking } = await buatUserDanToken(request, app, {
      name: "Packer",
      username: "packing",
      email: "packing@rcfprint.com",
      password: "packing123",
      role: ROLES.PACKING,
    }));

    customer = await buatCustomer();
    // Dua desain di galeri pelanggan ini, siap dipilih saat membuat order.
    designs = [
      await buatDesign(customer._id, { uploaded_by: adminUser._id }),
      await buatDesign(customer._id, { uploaded_by: adminUser._id }),
    ];
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
  });

  /** Buat order lewat API (jalur normal) dan kembalikan body.data. */
  const buatOrderApi = async (override = {}) => {
    const res = await sebagai(tokenAdmin).post({
      customer_id: customer._id.toString(),
      jenis: JENIS.DTF,
      design_ids: designs.map((d) => d._id.toString()),
      total_qty: 12,
      ...override,
    });
    return res.body.data;
  };

  describe("POST /orders", () => {
    it("membuat order DTF dengan nomor DTF/DDMMYY/001 dan status awal ANTRI_DESAIN", async () => {
      const res = await sebagai(tokenAdmin).post({
        customer_id: customer._id.toString(),
        jenis: JENIS.DTF,
        design_ids: designs.map((d) => d._id.toString()),
        total_qty: 24,
        catatan: "Kaos komunitas",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.kode_order).toMatch(/^DTF\/\d{6}\/001$/);
      expect(res.body.data.status).toBe(STATUS.ANTRI_DESAIN);
      expect(res.body.data.seq_harian).toBe(1);
      // file_count diturunkan dari jumlah design_ids; total_qty dari admin
      expect(res.body.data.file_count).toBe(2);
      expect(res.body.data.total_qty).toBe(24);
      // harga belum ada sampai order diselesaikan
      expect(res.body.data.total_harga).toBeNull();
      expect(res.body.data.metode_bayar).toBeNull();
    });

    it("menyimpan design_ids dan mengembalikannya ter-populate", async () => {
      const order = await buatOrderApi();

      expect(order.design_ids).toHaveLength(2);
      // ter-populate: tiap desain jadi objek dengan url & thumbnail
      expect(order.design_ids[0]).toHaveProperty("url");
      expect(order.design_ids[0]).toHaveProperty("thumbnail_url");
    });

    it("menolak order tanpa design_ids (minimal satu desain)", async () => {
      const res = await sebagai(tokenAdmin).post({
        customer_id: customer._id.toString(),
        jenis: JENIS.DTF,
        total_qty: 10,
      });
      expect(res.status).toBe(400);
    });

    it("menolak order tanpa total_qty", async () => {
      const res = await sebagai(tokenAdmin).post({
        customer_id: customer._id.toString(),
        jenis: JENIS.DTF,
        design_ids: designs.map((d) => d._id.toString()),
      });
      expect(res.status).toBe(400);
    });

    it("menolak design_ids milik pelanggan lain tanpa membakar nomor", async () => {
      const lain = await buatCustomer({
        name: "Pelanggan Lain",
        whatsapp: "081299998888",
      });
      const designLain = await buatDesign(lain._id, {
        uploaded_by: adminUser._id,
      });

      const res = await sebagai(tokenAdmin).post({
        customer_id: customer._id.toString(),
        jenis: JENIS.DTF,
        design_ids: [designLain._id.toString()],
        total_qty: 10,
      });

      expect(res.status).toBe(400);
      // gagal sebelum penomoran → tidak ada counter yang terbentuk
      expect(await CounterModel.countDocuments()).toBe(0);
    });

    it("memberi prefix PLF untuk POLYFLEX", async () => {
      const res = await sebagai(tokenAdmin).post({
        customer_id: customer._id.toString(),
        jenis: JENIS.POLYFLEX,
        design_ids: [designs[0]._id.toString()],
        total_qty: 5,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.kode_order).toMatch(/^PLF\/\d{6}\/001$/);
    });

    it("menaikkan nomor urut per jenis secara terpisah", async () => {
      const dtf1 = await buatOrderApi({ jenis: JENIS.DTF });
      const dtf2 = await buatOrderApi({ jenis: JENIS.DTF });
      const plf1 = await buatOrderApi({ jenis: JENIS.POLYFLEX });

      expect(dtf1.kode_order).toMatch(/\/001$/);
      expect(dtf2.kode_order).toMatch(/\/002$/);
      // Polyflex punya deret sendiri, mulai 001 lagi
      expect(plf1.kode_order).toMatch(/\/001$/);
    });

    it("mencatat status log pembuatan dengan status_dari null", async () => {
      const order = await buatOrderApi();
      const logs = await StatusLogModel.find({ order_id: order._id });

      expect(logs).toHaveLength(1);
      expect(logs[0].status_dari).toBeNull();
      expect(logs[0].status_ke).toBe(STATUS.ANTRI_DESAIN);
    });

    it("menolak jenis di luar DTF/POLYFLEX", async () => {
      const res = await sebagai(tokenAdmin).post({
        customer_id: customer._id.toString(),
        jenis: "SUBLIM",
        design_ids: [designs[0]._id.toString()],
        total_qty: 5,
      });
      expect(res.status).toBe(400);
    });

    it("menolak customer_id yang tidak ada dengan 404 tanpa membakar nomor", async () => {
      const res = await sebagai(tokenAdmin).post({
        customer_id: "64b7f0000000000000000000",
        jenis: JENIS.DTF,
        design_ids: [designs[0]._id.toString()],
        total_qty: 5,
      });

      expect(res.status).toBe(404);
      // counter tidak boleh terbentuk karena order gagal sebelum penomoran
      expect(await CounterModel.countDocuments()).toBe(0);
    });

    it("membuang field yang diselundupkan (status, total_harga, created_by)", async () => {
      const res = await sebagai(tokenAdmin).post({
        customer_id: customer._id.toString(),
        jenis: JENIS.DTF,
        design_ids: designs.map((d) => d._id.toString()),
        total_qty: 5,
        status: STATUS.SELESAI,
        total_harga: 999999,
        created_by: "64b7f0000000000000000000",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(STATUS.ANTRI_DESAIN);
      expect(res.body.data.total_harga).toBeNull();
    });

    it("menolak role non-admin dengan 403", async () => {
      const res = await sebagai(tokenDesigner).post({
        customer_id: customer._id.toString(),
        jenis: JENIS.DTF,
        design_ids: [designs[0]._id.toString()],
        total_qty: 5,
      });
      expect(res.status).toBe(403);
      expect(await OrderModel.countDocuments()).toBe(0);
    });

    it("menolak tanpa token dengan 401", async () => {
      const res = await request(app)
        .post(URL)
        .send({
          customer_id: customer._id.toString(),
          jenis: JENIS.DTF,
          design_ids: [designs[0]._id.toString()],
          total_qty: 5,
        });
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /orders/:id/status — alur DTF", () => {
    it("DESIGNER menandai desain selesai ANTRI_DESAIN → ANTRI_CETAK", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });

      const res = await sebagai(tokenDesigner).patch(`/${order._id}/status`, {});

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(STATUS.ANTRI_CETAK);
      // file_count & total_qty sudah terisi sejak create, tidak berubah
      expect(res.body.data.file_count).toBe(2);
      expect(res.body.data.total_qty).toBe(12);
      expect(res.body.data.designed_by).toBeTruthy();
    });

    it("PRODUKSI memajukan ANTRI_CETAK → PACKING", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });
      await sebagai(tokenDesigner).patch(`/${order._id}/status`, {});

      const res = await sebagai(tokenProduksi).patch(`/${order._id}/status`, {});
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(STATUS.PACKING);
    });

    it("PACKING memajukan PACKING → READY", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });
      await sebagai(tokenDesigner).patch(`/${order._id}/status`, {});
      await sebagai(tokenProduksi).patch(`/${order._id}/status`, {});

      const res = await sebagai(tokenPacking).patch(`/${order._id}/status`, {});
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(STATUS.READY);
    });

    it("menolak PRODUKSI memajukan saat masih ANTRI_DESAIN (role salah untuk status itu)", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });

      const res = await sebagai(tokenProduksi).patch(`/${order._id}/status`, {});
      expect(res.status).toBe(403);
    });

    it("tidak bisa memajukan lewat endpoint status saat sudah READY (menuju SELESAI)", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });
      await sebagai(tokenDesigner).patch(`/${order._id}/status`, {});
      await sebagai(tokenProduksi).patch(`/${order._id}/status`, {});
      await sebagai(tokenPacking).patch(`/${order._id}/status`, {});

      const res = await sebagai(tokenAdmin).patch(`/${order._id}/status`, {});
      expect(res.status).toBe(409);
    });
  });

  describe("PATCH /orders/:id/status — alur POLYFLEX", () => {
    it("memakai ANTRI_CUTTING, bukan ANTRI_CETAK", async () => {
      const order = await buatOrderApi({ jenis: JENIS.POLYFLEX });

      const res = await sebagai(tokenDesigner).patch(`/${order._id}/status`, {});

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(STATUS.ANTRI_CUTTING);
    });
  });

  describe("PATCH /orders/:id/selesai", () => {
    const sampaiReady = async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });
      await sebagai(tokenDesigner).patch(`/${order._id}/status`, {});
      await sebagai(tokenProduksi).patch(`/${order._id}/status`, {});
      await sebagai(tokenPacking).patch(`/${order._id}/status`, {});
      return order;
    };

    it("ADMIN menyelesaikan order READY dan mencatat pembayaran + selesai_at", async () => {
      const order = await sampaiReady();

      const res = await sebagai(tokenAdmin).patch(`/${order._id}/selesai`, {
        total_harga: 350000,
        metode_bayar: "CASH",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(STATUS.SELESAI);
      expect(res.body.data.total_harga).toBe(350000);
      expect(res.body.data.metode_bayar).toBe("CASH");
      expect(res.body.data.selesai_at).toBeTruthy();
    });

    it("menolak menyelesaikan order yang belum READY", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });

      const res = await sebagai(tokenAdmin).patch(`/${order._id}/selesai`, {
        total_harga: 100000,
        metode_bayar: "TRANSFER",
      });
      expect(res.status).toBe(409);
    });

    it("menolak tanpa total_harga / metode_bayar", async () => {
      const order = await sampaiReady();

      const res = await sebagai(tokenAdmin).patch(`/${order._id}/selesai`, {});
      expect(res.status).toBe(400);
    });

    it("menolak metode_bayar di luar CASH/TRANSFER", async () => {
      const order = await sampaiReady();

      const res = await sebagai(tokenAdmin).patch(`/${order._id}/selesai`, {
        total_harga: 100000,
        metode_bayar: "QRIS",
      });
      expect(res.status).toBe(400);
    });

    it("menolak role non-admin dengan 403", async () => {
      const order = await sampaiReady();

      const res = await sebagai(tokenPacking).patch(`/${order._id}/selesai`, {
        total_harga: 100000,
        metode_bayar: "CASH",
      });
      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /orders/:id/koreksi", () => {
    it("ADMIN bisa memundurkan status dengan alasan tercatat", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });
      await sebagai(tokenDesigner).patch(`/${order._id}/status`, {});

      const res = await sebagai(tokenAdmin).patch(`/${order._id}/koreksi`, {
        status: STATUS.ANTRI_DESAIN,
        catatan: "Salah klik operator",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(STATUS.ANTRI_DESAIN);

      const logs = await StatusLogModel.find({ order_id: order._id }).sort({
        createdAt: 1,
      });
      const koreksi = logs[logs.length - 1];
      expect(koreksi.status_dari).toBe(STATUS.ANTRI_CETAK);
      expect(koreksi.status_ke).toBe(STATUS.ANTRI_DESAIN);
      expect(koreksi.catatan).toBe("Salah klik operator");
    });

    it("membatalkan jejak pembayaran saat dikoreksi keluar dari SELESAI", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });
      await sebagai(tokenDesigner).patch(`/${order._id}/status`, {});
      await sebagai(tokenProduksi).patch(`/${order._id}/status`, {});
      await sebagai(tokenPacking).patch(`/${order._id}/status`, {});
      await sebagai(tokenAdmin).patch(`/${order._id}/selesai`, {
        total_harga: 200000,
        metode_bayar: "CASH",
      });

      const res = await sebagai(tokenAdmin).patch(`/${order._id}/koreksi`, {
        status: STATUS.READY,
        catatan: "Uang belum diterima, batalkan penyelesaian",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(STATUS.READY);
      expect(res.body.data.total_harga).toBeNull();
      expect(res.body.data.metode_bayar).toBeNull();
      expect(res.body.data.selesai_at).toBeNull();
    });

    it("menolak status yang tidak berlaku untuk jenis order (CUTTING pada DTF)", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });

      const res = await sebagai(tokenAdmin).patch(`/${order._id}/koreksi`, {
        status: STATUS.ANTRI_CUTTING,
        catatan: "coba lompat",
      });
      expect(res.status).toBe(400);
    });

    it("menolak koreksi tanpa alasan", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });

      const res = await sebagai(tokenAdmin).patch(`/${order._id}/koreksi`, {
        status: STATUS.PACKING,
      });
      expect(res.status).toBe(400);
    });

    it("menolak role non-admin dengan 403", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });

      const res = await sebagai(tokenDesigner).patch(`/${order._id}/koreksi`, {
        status: STATUS.PACKING,
        catatan: "iseng",
      });
      expect(res.status).toBe(403);
    });
  });

  describe("GET /orders", () => {
    beforeEach(async () => {
      await buatOrderApi({ jenis: JENIS.DTF });
      await buatOrderApi({ jenis: JENIS.POLYFLEX });
      // satu order yang dimajukan ke ANTRI_CETAK
      const o = await buatOrderApi({ jenis: JENIS.DTF });
      await sebagai(tokenDesigner).patch(`/${o._id}/status`, {});
    });

    it("mengembalikan semua order dengan paginasi dan populate customer", async () => {
      const res = await sebagai(tokenAdmin).get();

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.pagination.total).toBe(3);
      // customer_id ter-populate jadi objek dengan name & whatsapp
      expect(res.body.data[0].customer_id).toHaveProperty("name");
      expect(res.body.data[0].customer_id).toHaveProperty("whatsapp");
    });

    it("memfilter per jenis", async () => {
      const res = await sebagai(tokenAdmin).get("?jenis=POLYFLEX");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].jenis).toBe(JENIS.POLYFLEX);
    });

    it("memfilter per status tunggal", async () => {
      const res = await sebagai(tokenAdmin).get("?status=ANTRI_CETAK");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe(STATUS.ANTRI_CETAK);
    });

    it("mendukung status berulang (layar produksi dua status)", async () => {
      const res = await sebagai(tokenProduksi).get(
        "?status=ANTRI_CETAK&status=PACKING"
      );
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("aktif=true menyembunyikan order SELESAI", async () => {
      // selesaikan salah satu order dulu
      const o = await buatOrderApi({ jenis: JENIS.DTF });
      await sebagai(tokenDesigner).patch(`/${o._id}/status`, {});
      await sebagai(tokenProduksi).patch(`/${o._id}/status`, {});
      await sebagai(tokenPacking).patch(`/${o._id}/status`, {});
      await sebagai(tokenAdmin).patch(`/${o._id}/selesai`, {
        total_harga: 100000,
        metode_bayar: "CASH",
      });

      const semua = await sebagai(tokenAdmin).get();
      const aktif = await sebagai(tokenAdmin).get("?aktif=true");

      expect(semua.body.pagination.total).toBe(4);
      expect(aktif.body.pagination.total).toBe(3);
      expect(
        aktif.body.data.every((o) => o.status !== STATUS.SELESAI)
      ).toBe(true);
    });

    it("mencari berdasarkan kode_order", async () => {
      const res = await sebagai(tokenAdmin).get("?search=PLF");
      expect(res.status).toBe(200);
      expect(res.body.data.every((o) => o.kode_order.startsWith("PLF"))).toBe(
        true
      );
    });

    it("boleh dibaca role non-admin", async () => {
      const res = await sebagai(tokenPacking).get();
      expect(res.status).toBe(200);
    });

    it("menolak limit di atas 100 dan sort tidak dikenal", async () => {
      expect((await sebagai(tokenAdmin).get("?limit=500")).status).toBe(400);
      expect((await sebagai(tokenAdmin).get("?sort=whatsapp")).status).toBe(400);
    });
  });

  describe("GET /orders/:id dan /riwayat", () => {
    it("mengembalikan satu order", async () => {
      const order = await buatOrderApi();
      const res = await sebagai(tokenAdmin).get(`/${order._id}`);
      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(order._id.toString());
    });

    it("404 untuk order yang tidak ada, 400 untuk id bukan ObjectId", async () => {
      expect(
        (await sebagai(tokenAdmin).get("/64b7f0000000000000000000")).status
      ).toBe(404);
      expect((await sebagai(tokenAdmin).get("/bukan-id")).status).toBe(400);
    });

    it("mengembalikan riwayat status terurut", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });
      await sebagai(tokenDesigner).patch(`/${order._id}/status`, {});

      const res = await sebagai(tokenAdmin).get(`/${order._id}/riwayat`);
      expect(res.status).toBe(200);
      // pembuatan + satu transisi
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].status_dari).toBeNull();
      expect(res.body.data[1].status_ke).toBe(STATUS.ANTRI_CETAK);
    });
  });

  describe("PATCH /orders/:id (Update Order)", () => {
    it("ADMIN bisa mengubah total_qty, catatan, dan deadline", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF, total_qty: 10 });

      const res = await sebagai(tokenAdmin).patch(`/${order._id}`, {
        total_qty: 25,
        catatan: "Catatan direvisi",
        deadline: "2026-09-01T00:00:00.000Z",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.total_qty).toBe(25);
      expect(res.body.data.catatan).toBe("Catatan direvisi");
    });

    it("menolak role non-admin untuk update dengan 403", async () => {
      const order = await buatOrderApi();
      const res = await sebagai(tokenDesigner).patch(`/${order._id}`, {
        total_qty: 99,
      });
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /orders/:id (Hapus Order)", () => {
    it("ADMIN bisa menghapus order beserta riwayat status logs", async () => {
      const order = await buatOrderApi();

      const res = await sebagai(tokenAdmin).delete(`/${order._id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(order._id.toString());

      // Pastikan sudah tidak ada di DB
      const checkOrder = await OrderModel.findById(order._id);
      expect(checkOrder).toBeNull();

      const checkLogs = await StatusLogModel.find({ order_id: order._id });
      expect(checkLogs).toHaveLength(0);
    });

    it("menolak role non-admin untuk hapus dengan 403", async () => {
      const order = await buatOrderApi();
      const res = await sebagai(tokenDesigner).delete(`/${order._id}`);
      expect(res.status).toBe(403);
    });
  });
});

