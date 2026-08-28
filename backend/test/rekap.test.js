import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import OrderModel from "../src/modules/orders/order.model.js";
import { STATUS, JENIS, METODE_BAYAR } from "../src/modules/orders/order.constant.js";
import { ROLES } from "../src/modules/auth/auth.constant.js";
import { buatUserDanToken, buatCustomer } from "./helpers.js";

const URL = "/api/v1/rekap";

/**
 * Buat order SELESAI langsung lewat model (melewati alur status), dengan
 * selesai_at + pembayaran — titik awal yang dibutuhkan rekap.
 */
let seqRekap = 0;
const buatOrderSelesai = async ({
  customer_id,
  created_by,
  selesai_at,
  total_harga,
  metode_bayar,
  file_count = 1,
  total_qty = 10,
  jenis = JENIS.DTF,
} = {}) => {
  seqRekap += 1;
  return OrderModel.create({
    kode_order: `DTF/010926/${String(seqRekap).padStart(3, "0")}`,
    jenis,
    customer_id,
    created_by,
    tgl_order: new Date("2026-09-01T00:00:00+07:00"),
    seq_harian: seqRekap,
    status: STATUS.SELESAI,
    file_count,
    total_qty,
    total_harga,
    metode_bayar,
    selesai_at,
  });
};

describe("Rekap API", () => {
  let tokenAdmin;
  let tokenDesigner;
  let admin;
  let customerA;
  let customerB;

  beforeEach(async () => {
    ({ token: tokenAdmin, user: admin } = await buatUserDanToken(request, app, {
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

    customerA = await buatCustomer({
      name: "Budi",
      whatsapp: "081234567890",
    });
    customerB = await buatCustomer({
      name: "Citra",
      whatsapp: "081298765432",
    });
  });

  const getRekap = (token, qs = "") =>
    request(app)
      .get(`${URL}/harian${qs}`)
      .set("Authorization", `Bearer ${token}`);

  describe("otorisasi", () => {
    it("menolak tanpa token (401)", async () => {
      const res = await request(app).get(`${URL}/harian`);
      expect(res.status).toBe(401);
    });

    it("menolak role non-admin (403)", async () => {
      const res = await getRekap(tokenDesigner);
      expect(res.status).toBe(403);
    });

    it("mengizinkan admin (200)", async () => {
      const res = await getRekap(tokenAdmin);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("baris");
      expect(res.body.data).toHaveProperty("total");
    });
  });

  describe("agregasi harian", () => {
    it("mengelompokkan per hari selesai_at dan menjumlah cash/transfer", async () => {
      // 2 order selesai di 1 Sep, 1 order di 2 Sep (WIB)
      await buatOrderSelesai({
        customer_id: customerA._id,
        created_by: admin._id,
        selesai_at: new Date("2026-09-01T10:00:00+07:00"),
        total_harga: 100000,
        metode_bayar: METODE_BAYAR.CASH,
        file_count: 2,
        total_qty: 20,
      });
      await buatOrderSelesai({
        customer_id: customerB._id,
        created_by: admin._id,
        selesai_at: new Date("2026-09-01T14:00:00+07:00"),
        total_harga: 250000,
        metode_bayar: METODE_BAYAR.TRANSFER,
        file_count: 1,
        total_qty: 5,
      });
      await buatOrderSelesai({
        customer_id: customerA._id,
        created_by: admin._id,
        selesai_at: new Date("2026-09-02T09:00:00+07:00"),
        total_harga: 75000,
        metode_bayar: METODE_BAYAR.CASH,
        file_count: 3,
        total_qty: 8,
      });

      const res = await getRekap(
        tokenAdmin,
        "?dari=2026-09-01&sampai=2026-09-02"
      );

      expect(res.status).toBe(200);
      const { baris, total } = res.body.data;
      expect(baris).toHaveLength(2);

      const hari1 = baris.find((b) => b.tanggal === "2026-09-01");
      expect(hari1.pelanggan).toBe(2); // Budi + Citra
      expect(hari1.file).toBe(3);
      expect(hari1.qty).toBe(25);
      expect(hari1.cash).toBe(100000);
      expect(hari1.transfer).toBe(250000);

      const hari2 = baris.find((b) => b.tanggal === "2026-09-02");
      expect(hari2.pelanggan).toBe(1);
      expect(hari2.cash).toBe(75000);
      expect(hari2.transfer).toBe(0);

      // TOTAL lintas rentang
      expect(total.cash).toBe(175000);
      expect(total.transfer).toBe(250000);
      expect(total.pendapatan).toBe(425000);
      expect(total.file).toBe(6);
      expect(total.qty).toBe(33);
      // Budi muncul di 2 hari, tapi pelanggan unik lintas rentang = 2
      expect(total.pelanggan).toBe(2);
      expect(total.jumlahOrder).toBe(3);
    });

    it("hanya menghitung order berstatus SELESAI", async () => {
      // order belum selesai TIDAK boleh masuk rekap
      await OrderModel.create({
        kode_order: "DTF/010926/900",
        jenis: JENIS.DTF,
        customer_id: customerA._id,
        created_by: admin._id,
        tgl_order: new Date("2026-09-01T00:00:00+07:00"),
        seq_harian: 900,
        status: STATUS.READY,
        file_count: 5,
        total_qty: 50,
      });
      await buatOrderSelesai({
        customer_id: customerA._id,
        created_by: admin._id,
        selesai_at: new Date("2026-09-01T11:00:00+07:00"),
        total_harga: 50000,
        metode_bayar: METODE_BAYAR.CASH,
      });

      const res = await getRekap(
        tokenAdmin,
        "?dari=2026-09-01&sampai=2026-09-01"
      );

      const { baris, total } = res.body.data;
      expect(baris).toHaveLength(1);
      expect(total.pendapatan).toBe(50000);
      expect(total.jumlahOrder).toBe(1); // yang READY tidak dihitung
    });

    it("menghormati batas rentang (order di luar rentang tidak masuk)", async () => {
      await buatOrderSelesai({
        customer_id: customerA._id,
        created_by: admin._id,
        selesai_at: new Date("2026-08-31T23:00:00+07:00"), // sehari sebelum
        total_harga: 999000,
        metode_bayar: METODE_BAYAR.CASH,
      });
      await buatOrderSelesai({
        customer_id: customerA._id,
        created_by: admin._id,
        selesai_at: new Date("2026-09-01T08:00:00+07:00"),
        total_harga: 50000,
        metode_bayar: METODE_BAYAR.CASH,
      });

      const res = await getRekap(
        tokenAdmin,
        "?dari=2026-09-01&sampai=2026-09-01"
      );

      const { baris, total } = res.body.data;
      expect(baris).toHaveLength(1);
      expect(baris[0].tanggal).toBe("2026-09-01");
      expect(total.pendapatan).toBe(50000);
    });

    it("mengembalikan baris kosong + total nol saat tidak ada data", async () => {
      const res = await getRekap(
        tokenAdmin,
        "?dari=2026-09-01&sampai=2026-09-05"
      );

      expect(res.status).toBe(200);
      expect(res.body.data.baris).toEqual([]);
      expect(res.body.data.total.pendapatan).toBe(0);
      expect(res.body.data.total.pelanggan).toBe(0);
    });
  });

  describe("validasi query", () => {
    it("menolak sampai sebelum dari (400)", async () => {
      const res = await getRekap(
        tokenAdmin,
        "?dari=2026-09-05&sampai=2026-09-01"
      );
      expect(res.status).toBe(400);
    });

    it("menolak tanggal tidak valid (400)", async () => {
      const res = await getRekap(tokenAdmin, "?dari=bukan-tanggal");
      expect(res.status).toBe(400);
    });
  });
});
