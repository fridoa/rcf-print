import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import OrderModel from "../src/modules/orders/order.model.js";
import CounterModel from "../src/modules/orders/counter.model.js";
import StatusLogModel from "../src/modules/orders/status-log.model.js";
import { STATUS, JENIS } from "../src/modules/orders/order.constant.js";
import { ROLES } from "../src/modules/auth/auth.constant.js";
import { buatUserDanToken, buatCustomer, buatOrder } from "./helpers.js";

const URL = "/api/v1/orders";

describe("Order API", () => {
  let tokenAdmin;
  let adminUser;
  let tokenDesigner;
  let tokenProduksi;
  let tokenPacking;
  let customer;

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
    delete: (path = "") =>
      request(app)
        .delete(`${URL}${path}`)
        .set("Authorization", `Bearer ${token}`),
  });

  // Angka yang dikirim DESIGNER saat menandai desain selesai — sejak
  // file_count & total_qty jadi wewenang designer, transisi keluar
  // ANTRI_DESAIN wajib menyertakan keduanya.
  const DESAIN = { file_count: 2, total_qty: 12 };

  /** Buat order lewat API (jalur normal) dan kembalikan body.data. */
  const buatOrderApi = async (override = {}) => {
    const res = await sebagai(tokenAdmin).post({
      customer_id: customer._id.toString(),
      jenis: JENIS.DTF,
      ...override,
    });
    return res.body.data;
  };

  describe("POST /orders", () => {
    it("membuat order DTF dengan nomor DTF/DDMMYY/001 dan status awal ANTRI_DESAIN", async () => {
      const res = await sebagai(tokenAdmin).post({
        customer_id: customer._id.toString(),
        jenis: JENIS.DTF,
        catatan: "Kaos komunitas",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.kode_order).toMatch(/^DTF\/\d{6}\/001$/);
      expect(res.body.data.status).toBe(STATUS.ANTRI_DESAIN);
      expect(res.body.data.seq_harian).toBe(1);
      // file_count & total_qty belum diketahui saat order dibuat — designer
      // yang menentukan keduanya saat menandai desain selesai
      expect(res.body.data.file_count).toBeNull();
      expect(res.body.data.total_qty).toBeNull();
      // harga belum ada sampai order diselesaikan
      expect(res.body.data.total_harga).toBeNull();
      expect(res.body.data.metode_bayar).toBeNull();
    });

    it("mengembalikan pelanggan ter-populate", async () => {
      const order = await buatOrderApi();

      expect(order.customer_id).toHaveProperty("name");
      expect(order.customer_id).toHaveProperty("whatsapp");
    });

    it("membuat order tanpa file_count / total_qty (diisi designer nanti)", async () => {
      const res = await sebagai(tokenAdmin).post({
        customer_id: customer._id.toString(),
        jenis: JENIS.DTF,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.file_count).toBeNull();
      expect(res.body.data.total_qty).toBeNull();
    });

    it("mengabaikan file_count / total_qty yang diselundupkan admin saat create", async () => {
      const res = await sebagai(tokenAdmin).post({
        customer_id: customer._id.toString(),
        jenis: JENIS.DTF,
        file_count: 9,
        total_qty: 99,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.file_count).toBeNull();
      expect(res.body.data.total_qty).toBeNull();
    });

    it("memberi prefix PLF untuk POLYFLEX", async () => {
      const res = await sebagai(tokenAdmin).post({
        customer_id: customer._id.toString(),
        jenis: JENIS.POLYFLEX,
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

    it("menolak jenis di luar daftar JENIS", async () => {
      const res = await sebagai(tokenAdmin).post({
        customer_id: customer._id.toString(),
        // sengaja jenis yang tidak pernah ada; jangan pakai nama jenis nyata
        // (SUBLIM dulu dipakai di sini lalu jadi valid, testnya jadi bohong)
        jenis: "SABLON_MANUAL",
      });
      expect(res.status).toBe(400);
    });

    it("menolak customer_id yang tidak ada dengan 404 tanpa membakar nomor", async () => {
      const res = await sebagai(tokenAdmin).post({
        customer_id: "64b7f0000000000000000000",
        jenis: JENIS.DTF,
      });

      expect(res.status).toBe(404);
      // counter tidak boleh terbentuk karena order gagal sebelum penomoran
      expect(await CounterModel.countDocuments()).toBe(0);
    });

    it("membuang field yang diselundupkan (status, total_harga, created_by)", async () => {
      const res = await sebagai(tokenAdmin).post({
        customer_id: customer._id.toString(),
        jenis: JENIS.DTF,
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
        });
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /orders/:id/status — alur DTF", () => {
    it("DESIGNER menandai desain selesai ANTRI_DESAIN → ANTRI_CETAK", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });

      const res = await sebagai(tokenDesigner).patch(`/${order._id}/status`, DESAIN);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(STATUS.ANTRI_CETAK);
      // angka yang dikirim designer tersimpan di order
      expect(res.body.data.file_count).toBe(2);
      expect(res.body.data.total_qty).toBe(12);
      expect(res.body.data.designed_by).toBeTruthy();
    });

    it("menolak selesai desain tanpa file_count / total_qty", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });

      const res = await sebagai(tokenDesigner).patch(`/${order._id}/status`, {});

      expect(res.status).toBe(400);
      // order harus tetap di antrian desain
      const setelah = await OrderModel.findById(order._id);
      expect(setelah.status).toBe(STATUS.ANTRI_DESAIN);
      expect(setelah.file_count).toBeNull();
    });

    it("menolak file_count / total_qty nol atau negatif dari designer", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });

      const res = await sebagai(tokenDesigner).patch(`/${order._id}/status`, {
        file_count: 0,
        total_qty: -3,
      });

      expect(res.status).toBe(400);
    });

    it("transisi produksi tidak mengubah angka yang sudah ditetapkan designer", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });
      await sebagai(tokenDesigner).patch(`/${order._id}/status`, DESAIN);

      const res = await sebagai(tokenProduksi).patch(`/${order._id}/status`, {
        file_count: 99,
        total_qty: 99,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.file_count).toBe(2);
      expect(res.body.data.total_qty).toBe(12);
    });

    it("PRODUKSI memajukan ANTRI_CETAK → PACKING", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });
      await sebagai(tokenDesigner).patch(`/${order._id}/status`, DESAIN);

      const res = await sebagai(tokenProduksi).patch(`/${order._id}/status`, {});
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(STATUS.PACKING);
    });

    it("PACKING memajukan PACKING → READY", async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });
      await sebagai(tokenDesigner).patch(`/${order._id}/status`, DESAIN);
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
      await sebagai(tokenDesigner).patch(`/${order._id}/status`, DESAIN);
      await sebagai(tokenProduksi).patch(`/${order._id}/status`, {});
      await sebagai(tokenPacking).patch(`/${order._id}/status`, {});

      const res = await sebagai(tokenAdmin).patch(`/${order._id}/status`, {});
      expect(res.status).toBe(409);
    });
  });

  describe("PATCH /orders/:id/status — alur POLYFLEX", () => {
    it("memakai ANTRI_CUTTING, bukan ANTRI_CETAK", async () => {
      const order = await buatOrderApi({ jenis: JENIS.POLYFLEX });

      const res = await sebagai(tokenDesigner).patch(`/${order._id}/status`, DESAIN);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(STATUS.ANTRI_CUTTING);
    });
  });

  describe("PATCH /orders/:id/status — alur SUBLIM", () => {
    it("lewat desain dulu, lalu ANTRI_SUBLIM (bukan cetak/cutting)", async () => {
      const order = await buatOrderApi({ jenis: JENIS.SUBLIM });
      expect(order.status).toBe(STATUS.ANTRI_DESAIN);

      const res = await sebagai(tokenDesigner).patch(`/${order._id}/status`, DESAIN);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(STATUS.ANTRI_SUBLIM);
    });

    it("kode order memakai prefix SBL", async () => {
      const order = await buatOrderApi({ jenis: JENIS.SUBLIM });
      expect(order.kode_order).toMatch(/^SBL\/\d{6}\/\d{3}$/);
    });

    it("PRODUKSI memajukan ANTRI_SUBLIM ke PACKING, lalu PACKING ke READY", async () => {
      const order = await buatOrderApi({ jenis: JENIS.SUBLIM });
      await sebagai(tokenDesigner).patch(`/${order._id}/status`, DESAIN);

      const kePacking = await sebagai(tokenProduksi).patch(
        `/${order._id}/status`,
        {}
      );
      expect(kePacking.status).toBe(200);
      expect(kePacking.body.data.status).toBe(STATUS.PACKING);

      const keReady = await sebagai(tokenPacking).patch(
        `/${order._id}/status`,
        {}
      );
      expect(keReady.status).toBe(200);
      expect(keReady.body.data.status).toBe(STATUS.READY);
    });

    it("menolak koreksi ke ANTRI_CETAK karena bukan bagian alur SUBLIM", async () => {
      const order = await buatOrderApi({ jenis: JENIS.SUBLIM });

      const res = await sebagai(tokenAdmin).patch(`/${order._id}/koreksi`, {
        status: STATUS.ANTRI_CETAK,
        catatan: "salah pilih langkah produksi",
      });

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /orders/:id/selesai", () => {
    const sampaiReady = async () => {
      const order = await buatOrderApi({ jenis: JENIS.DTF });
      await sebagai(tokenDesigner).patch(`/${order._id}/status`, DESAIN);
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
      await sebagai(tokenDesigner).patch(`/${order._id}/status`, DESAIN);

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
      await sebagai(tokenDesigner).patch(`/${order._id}/status`, DESAIN);
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
      await sebagai(tokenDesigner).patch(`/${o._id}/status`, DESAIN);
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
      await sebagai(tokenDesigner).patch(`/${o._id}/status`, DESAIN);
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

  describe("GET /orders — filter rentang tanggal", () => {
    // Tanggal dibuat langsung lewat model supaya tgl_order bisa diatur ke masa
    // lalu (jalur API selalu memakai hari ini).
    const HARI_INI = new Date("2026-08-22T00:00:00+07:00");
    const SEMINGGU_LALU = new Date("2026-08-16T00:00:00+07:00");
    const BULAN_LALU = new Date("2026-07-10T00:00:00+07:00");

    /** buatOrder + field wajib yang tak punya default (customer & pembuat). */
    const buatOrderTgl = (override) =>
      buatOrder({
        customer_id: customer._id,
        created_by: adminUser._id,
        ...override,
      });

    beforeEach(async () => {
      await buatOrderTgl({
        kode_order: "DTF/220826/901",
        tgl_order: HARI_INI,
        status: STATUS.ANTRI_DESAIN,
      });
      await buatOrderTgl({
        kode_order: "DTF/160826/902",
        tgl_order: SEMINGGU_LALU,
        status: STATUS.SELESAI,
      });
      // Order LAMA yang belum selesai — ini yang tidak boleh hilang.
      await buatOrderTgl({
        kode_order: "DTF/100726/903",
        tgl_order: BULAN_LALU,
        status: STATUS.ANTRI_CETAK,
      });
    });

    it("menyaring order dalam rentang tgl_dari s/d tgl_sampai (inklusif)", async () => {
      const res = await sebagai(tokenAdmin).get(
        "?tgl_dari=2026-08-16&tgl_sampai=2026-08-22"
      );

      expect(res.status).toBe(200);
      const kode = res.body.data.map((o) => o.kode_order);
      expect(kode).toContain("DTF/220826/901");
      expect(kode).toContain("DTF/160826/902");
      expect(kode).not.toContain("DTF/100726/903");
    });

    it("batas rentang inklusif di kedua ujung (satu hari saja)", async () => {
      const res = await sebagai(tokenAdmin).get(
        "?tgl_dari=2026-08-22&tgl_sampai=2026-08-22"
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].kode_order).toBe("DTF/220826/901");
    });

    it("menghitung order belum selesai yang jatuh di luar rentang", async () => {
      const res = await sebagai(tokenAdmin).get(
        "?tgl_dari=2026-08-16&tgl_sampai=2026-08-22"
      );

      // DTF/100726/903 (ANTRI_CETAK, bulan lalu) ada di luar rentang.
      expect(res.body.meta.aktif_di_luar_rentang).toBe(1);
    });

    it("tidak menghitung order SELESAI di luar rentang", async () => {
      const res = await sebagai(tokenAdmin).get(
        "?tgl_dari=2026-08-22&tgl_sampai=2026-08-22"
      );

      // Di luar rentang ada 2 order: satu SELESAI, satu ANTRI_CETAK.
      expect(res.body.meta.aktif_di_luar_rentang).toBe(1);
    });

    it("sertakan_aktif_luar=true memunculkan order belum selesai dari luar rentang", async () => {
      const res = await sebagai(tokenAdmin).get(
        "?tgl_dari=2026-08-22&tgl_sampai=2026-08-22&sertakan_aktif_luar=true"
      );

      expect(res.status).toBe(200);
      const kode = res.body.data.map((o) => o.kode_order);
      expect(kode).toContain("DTF/220826/901");
      expect(kode).toContain("DTF/100726/903");
      // Yang SELESAI di luar rentang tetap tidak ikut.
      expect(kode).not.toContain("DTF/160826/902");
      // Sudah ditampilkan → tidak perlu diberitahu lagi.
      expect(res.body.meta.aktif_di_luar_rentang).toBe(0);
    });

    it("tanpa rentang, meta.aktif_di_luar_rentang = 0", async () => {
      const res = await sebagai(tokenAdmin).get();
      expect(res.body.meta.aktif_di_luar_rentang).toBe(0);
    });

    it("tidak menghitung aktif di luar rentang saat status dikunci pemanggil", async () => {
      const res = await sebagai(tokenAdmin).get(
        "?tgl_dari=2026-08-22&tgl_sampai=2026-08-22&status=SELESAI"
      );

      expect(res.status).toBe(200);
      expect(res.body.meta.aktif_di_luar_rentang).toBe(0);
    });

    it("rentang tetap menghormati filter lain (jenis)", async () => {
      await buatOrderTgl({
        kode_order: "PLF/220826/904",
        jenis: JENIS.POLYFLEX,
        tgl_order: HARI_INI,
        status: STATUS.ANTRI_DESAIN,
      });

      const res = await sebagai(tokenAdmin).get(
        "?tgl_dari=2026-08-22&tgl_sampai=2026-08-22&jenis=POLYFLEX"
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].kode_order).toBe("PLF/220826/904");
    });

    it("menolak rentang terbalik dengan 400", async () => {
      const res = await sebagai(tokenAdmin).get(
        "?tgl_dari=2026-08-22&tgl_sampai=2026-08-16"
      );
      expect(res.status).toBe(400);
    });

    it("menolak tanggal tidak valid dengan 400", async () => {
      expect(
        (await sebagai(tokenAdmin).get("?tgl_dari=bukan-tanggal")).status
      ).toBe(400);
    });

    it("menerima sort tgl_order", async () => {
      const naik = await sebagai(tokenAdmin).get("?sort=tgl_order");
      const turun = await sebagai(tokenAdmin).get("?sort=-tgl_order");

      expect(naik.status).toBe(200);
      expect(turun.status).toBe(200);
      expect(naik.body.data[0].kode_order).toBe("DTF/100726/903");
      expect(turun.body.data[0].kode_order).toBe("DTF/220826/901");
    });
  });

  describe("GET /orders/tertahan", () => {
    /** buatOrder + field wajib yang tak punya default. */
    const buatOrderTertahan = (override) =>
      buatOrder({
        customer_id: customer._id,
        created_by: adminUser._id,
        ...override,
      });

    /** Timestamp N hari lalu, untuk mengatur status_sejak secara eksplisit. */
    const hariLalu = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

    it("mencakup semua status non-final, bukan cuma READY", async () => {
      await buatOrderTertahan({
        kode_order: "DTF/010826/801",
        status: STATUS.ANTRI_DESAIN,
        status_sejak: hariLalu(5),
      });
      await buatOrderTertahan({
        kode_order: "DTF/010826/802",
        status: STATUS.ANTRI_CETAK,
        status_sejak: hariLalu(6),
      });
      await buatOrderTertahan({
        kode_order: "PLF/010826/803",
        jenis: JENIS.POLYFLEX,
        status: STATUS.ANTRI_CUTTING,
        status_sejak: hariLalu(7),
      });
      await buatOrderTertahan({
        kode_order: "DTF/010826/804",
        status: STATUS.PACKING,
        status_sejak: hariLalu(8),
      });
      await buatOrderTertahan({
        kode_order: "SBL/010826/805",
        jenis: JENIS.SUBLIM,
        status: STATUS.ANTRI_SUBLIM,
        status_sejak: hariLalu(9),
      });
      await buatOrderTertahan({
        kode_order: "DTF/010826/806",
        status: STATUS.READY,
        status_sejak: hariLalu(10),
      });

      const res = await sebagai(tokenAdmin).get("/tertahan?ambang_hari=3");

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(6);
      expect(res.body.data.per_status).toMatchObject({
        ANTRI_DESAIN: 1,
        ANTRI_CETAK: 1,
        ANTRI_CUTTING: 1,
        ANTRI_SUBLIM: 1,
        PACKING: 1,
        READY: 1,
      });
    });

    it("setiap baris menyebut order mana dan status apa", async () => {
      await buatOrderTertahan({
        kode_order: "DTF/010826/807",
        status: STATUS.PACKING,
        status_sejak: hariLalu(5),
      });

      const res = await sebagai(tokenAdmin).get("/tertahan?ambang_hari=3");

      const baris = res.body.data.items[0];
      expect(baris.kode_order).toBe("DTF/010826/807");
      expect(baris.status).toBe(STATUS.PACKING);
      expect(baris.status_sejak).toBeTruthy();
      expect(baris.customer_id.name).toBe(customer.name);
    });

    it("mengabaikan order yang baru pindah status meski tgl_order-nya lama", async () => {
      // Inti fitur: umur dihitung dari status_sejak, bukan tgl_order. Order ini
      // dibuat sebulan lalu tapi tadi baru maju ke PACKING — tidak tertahan.
      await buatOrderTertahan({
        kode_order: "DTF/100726/807",
        tgl_order: new Date("2026-07-10T00:00:00+07:00"),
        status: STATUS.PACKING,
        status_sejak: hariLalu(0),
      });

      const res = await sebagai(tokenAdmin).get("/tertahan?ambang_hari=3");

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(0);
    });

    it("tidak menghitung order SELESAI meski lama tak tersentuh", async () => {
      await buatOrderTertahan({
        kode_order: "DTF/010826/808",
        status: STATUS.SELESAI,
        status_sejak: hariLalu(30),
        selesai_at: hariLalu(30),
      });

      const res = await sebagai(tokenAdmin).get("/tertahan?ambang_hari=3");

      expect(res.body.data.total).toBe(0);
      expect(res.body.data.per_status.SELESAI).toBeUndefined();
    });

    it("ambang_hari menyaring: order 4 hari lolos ambang 3 tapi tidak ambang 7", async () => {
      await buatOrderTertahan({
        kode_order: "DTF/010826/809",
        status: STATUS.ANTRI_DESAIN,
        status_sejak: hariLalu(4),
      });

      const ambang3 = await sebagai(tokenAdmin).get("/tertahan?ambang_hari=3");
      const ambang7 = await sebagai(tokenAdmin).get("/tertahan?ambang_hari=7");

      expect(ambang3.body.data.total).toBe(1);
      expect(ambang7.body.data.total).toBe(0);
    });

    it("total tetap penuh meski items dibatasi limit", async () => {
      for (let i = 0; i < 4; i += 1) {
        await buatOrderTertahan({
          kode_order: `DTF/010826/81${i}`,
          status: STATUS.PACKING,
          status_sejak: hariLalu(5 + i),
        });
      }

      const res = await sebagai(tokenAdmin).get(
        "/tertahan?ambang_hari=3&limit=2"
      );

      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.total).toBe(4);
      expect(res.body.data.per_status.PACKING).toBe(4);
    });

    it("mengurutkan yang paling lama tertahan di atas", async () => {
      await buatOrderTertahan({
        kode_order: "DTF/010826/821",
        status: STATUS.ANTRI_CETAK,
        status_sejak: hariLalu(4),
      });
      await buatOrderTertahan({
        kode_order: "DTF/010826/822",
        status: STATUS.READY,
        status_sejak: hariLalu(9),
      });

      const res = await sebagai(tokenAdmin).get("/tertahan?ambang_hari=3");

      expect(res.body.data.items[0].kode_order).toBe("DTF/010826/822");
    });

    it("menolak ambang_hari 0 dengan 400", async () => {
      const res = await sebagai(tokenAdmin).get("/tertahan?ambang_hari=0");
      expect(res.status).toBe(400);
    });

    it("memakai ambang default 3 hari saat query kosong", async () => {
      await buatOrderTertahan({
        kode_order: "DTF/010826/831",
        status: STATUS.ANTRI_DESAIN,
        status_sejak: hariLalu(5),
      });

      const res = await sebagai(tokenAdmin).get("/tertahan");

      expect(res.status).toBe(200);
      expect(res.body.data.ambang_hari).toBe(3);
      expect(res.body.data.total).toBe(1);
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
      await sebagai(tokenDesigner).patch(`/${order._id}/status`, DESAIN);

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
      const order = await buatOrderApi({ jenis: JENIS.DTF });

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

