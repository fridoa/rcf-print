import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { ROLES } from "../src/modules/auth/auth.constant.js";
import { STATUS } from "../src/modules/orders/order.constant.js";
import { buatUserDanToken, buatCustomer, buatOrder } from "./helpers.js";

const URL = "/api/v1/orders/statistik";

/**
 * Test endpoint statistik dashboard.
 *
 * Fokus: bentuk respons benar dan angka dihitung tepat dari beberapa order
 * pada status/tanggal berbeda. Tanggal "hari ini" dibuat dinamis (new Date)
 * supaya test tidak lapuk oleh perbedaan tanggal saat dijalankan.
 */
describe("GET /orders/statistik", () => {
  let tokenAdmin;
  let adminUser;
  let customer;

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
    customer = await buatCustomer({ name: "Budi", whatsapp: "081234567890" });
  });

  it("wajib login (401 tanpa token)", async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
  });

  it("mengembalikan perStatus, aktifTotal, overdue, dan angka hari ini", async () => {
    const kemarin = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const besok = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 2 order antri desain (salah satunya overdue: deadline kemarin).
    await buatOrder({
      customer_id: customer._id,
      created_by: adminUser._id,
      status: STATUS.ANTRI_DESAIN,
      total_qty: 10,
      deadline: kemarin,
    });
    await buatOrder({
      customer_id: customer._id,
      created_by: adminUser._id,
      status: STATUS.ANTRI_DESAIN,
      total_qty: 5,
      deadline: besok,
    });
    // 1 order READY.
    await buatOrder({
      customer_id: customer._id,
      created_by: adminUser._id,
      status: STATUS.READY,
      total_qty: 3,
    });
    // 1 order SELESAI hari ini + pembayaran (masuk pendapatan hari ini).
    await buatOrder({
      customer_id: customer._id,
      created_by: adminUser._id,
      status: STATUS.SELESAI,
      total_qty: 8,
      total_harga: 150000,
      metode_bayar: "CASH",
      selesai_at: new Date(),
    });

    const res = await request(app)
      .get(URL)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    const d = res.body.data;

    // perStatus punya SEMUA status (default 0) + hitungan benar.
    expect(d.perStatus.ANTRI_DESAIN).toEqual({ count: 2, qty: 15 });
    expect(d.perStatus.READY).toEqual({ count: 1, qty: 3 });
    expect(d.perStatus.ANTRI_CUTTING).toEqual({ count: 0, qty: 0 });

    // aktif = semua kecuali SELESAI (2 desain + 1 ready = 3).
    expect(d.aktifTotal).toBe(3);
    // overdue = 1 (order desain dengan deadline kemarin).
    expect(d.overdue).toBe(1);

    // hari ini: 1 selesai, pendapatan 150000.
    expect(d.hariIni.selesai).toBe(1);
    expect(d.hariIni.pendapatan).toBe(150000);
  });

  it("perStatusJenis memisah antrian per jenis (DTF vs POLYFLEX vs SUBLIM)", async () => {
    await buatOrder({
      customer_id: customer._id,
      created_by: adminUser._id,
      jenis: "DTF",
      status: STATUS.ANTRI_CETAK,
      total_qty: 4,
    });
    await buatOrder({
      customer_id: customer._id,
      created_by: adminUser._id,
      jenis: "POLYFLEX",
      status: STATUS.ANTRI_CUTTING,
      total_qty: 6,
    });
    await buatOrder({
      customer_id: customer._id,
      created_by: adminUser._id,
      jenis: "SUBLIM",
      status: STATUS.ANTRI_SUBLIM,
      total_qty: 5,
    });

    const res = await request(app)
      .get(URL)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.perStatusJenis.ANTRI_CETAK.DTF).toBe(1);
    expect(d.perStatusJenis.ANTRI_CUTTING.POLYFLEX).toBe(1);
    expect(d.perStatusJenis.ANTRI_SUBLIM.SUBLIM).toBe(1);
  });
});
