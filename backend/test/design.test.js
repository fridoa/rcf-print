import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import DesignModel from "../src/modules/designs/design.model.js";
import OrderModel from "../src/modules/orders/order.model.js";
import { ROLES } from "../src/modules/auth/auth.constant.js";
import { STATUS } from "../src/modules/orders/order.constant.js";
import { buatUserDanToken, buatCustomer, buatDesign } from "./helpers.js";

const URL = "/api/v1/designs";

// PNG 1x1 minimal — cukup untuk multipart upload di test. Isi byte-nya tetap
// supaya hash deterministik dan test dedup bisa diandalkan.
const PNG_1x1 = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f01f0005000501ffa0d5f30000000049454e44ae426082",
  "hex"
);
const PNG_LAIN = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489000000104944415478da63fcffff3f0300050001ff9aab6c2c0000000049454e44ae426082",
  "hex"
);

describe("Design (galeri) API", () => {
  let tokenAdmin;
  let adminUser;
  let tokenDesigner;
  let tokenProduksi;
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

    customer = await buatCustomer();
  });

  // Helper upload: kirim multipart dengan field file + customer_id + label.
  const upload = (token, { customer_id, label, buffer = PNG_1x1, fileName = "logo.png" } = {}) => {
    const req = request(app)
      .post(URL)
      .set("Authorization", `Bearer ${token}`)
      .field("customer_id", customer_id ?? customer._id.toString());
    if (label !== undefined) req.field("label", label);
    return req.attach("file", buffer, fileName);
  };

  describe("POST /designs (upload)", () => {
    it("ADMIN mengunggah desain baru ke galeri pelanggan (201)", async () => {
      const res = await upload(tokenAdmin, { label: "Logo depan" });

      expect(res.status).toBe(201);
      expect(res.body.deduped).toBe(false);
      expect(res.body.data.customer_id).toBe(customer._id.toString());
      expect(res.body.data.label).toBe("Logo depan");
      expect(res.body.data.url).toBeTruthy();
      expect(res.body.data.thumbnail_url).toBeTruthy();
      expect(res.body.data.hash).toBeTruthy();
      expect(res.body.data.uploaded_by).toBe(adminUser._id.toString());
    });

    it("DESIGNER juga boleh mengunggah", async () => {
      const res = await upload(tokenDesigner);
      expect(res.status).toBe(201);
    });

    it("dedup: mengunggah file byte-identik mengembalikan desain lama (200, tanpa baris baru)", async () => {
      const pertama = await upload(tokenAdmin, { label: "asli" });
      expect(pertama.status).toBe(201);

      const kedua = await upload(tokenAdmin, { label: "coba lagi" });
      expect(kedua.status).toBe(200);
      expect(kedua.body.deduped).toBe(true);
      // id sama dengan yang pertama
      expect(kedua.body.data._id).toBe(pertama.body.data._id);
      // total dokumen tetap 1
      expect(await DesignModel.countDocuments({ customer_id: customer._id })).toBe(1);
    });

    it("file byte berbeda menghasilkan desain baru", async () => {
      await upload(tokenAdmin, { buffer: PNG_1x1 });
      const res = await upload(tokenAdmin, { buffer: PNG_LAIN, fileName: "lain.png" });

      expect(res.status).toBe(201);
      expect(await DesignModel.countDocuments({ customer_id: customer._id })).toBe(2);
    });

    it("dua pelanggan boleh punya file identik tanpa bentrok", async () => {
      const lain = await buatCustomer({
        name: "Pelanggan Lain",
        whatsapp: "081211112222",
      });

      const a = await upload(tokenAdmin, { customer_id: customer._id.toString() });
      const b = await upload(tokenAdmin, { customer_id: lain._id.toString() });

      expect(a.status).toBe(201);
      expect(b.status).toBe(201);
      expect(a.body.data._id).not.toBe(b.body.data._id);
    });

    it("menolak upload tanpa file (400)", async () => {
      const res = await request(app)
        .post(URL)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .field("customer_id", customer._id.toString());
      expect(res.status).toBe(400);
    });

    it("menolak tipe file non-gambar (400)", async () => {
      const res = await request(app)
        .post(URL)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .field("customer_id", customer._id.toString())
        .attach("file", Buffer.from("%PDF-1.4 halo"), "berkas.pdf");
      expect(res.status).toBe(400);
    });

    it("menolak upload ke pelanggan yang tidak ada (404)", async () => {
      const res = await upload(tokenAdmin, {
        customer_id: "64b7f0000000000000000000",
      });
      expect(res.status).toBe(404);
    });

    it("menolak role PRODUKSI mengunggah (403)", async () => {
      const res = await upload(tokenProduksi);
      expect(res.status).toBe(403);
    });

    it("menolak tanpa token (401)", async () => {
      const res = await request(app)
        .post(URL)
        .field("customer_id", customer._id.toString())
        .attach("file", PNG_1x1, "logo.png");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /designs (galeri per-pelanggan)", () => {
    it("mengembalikan hanya desain milik pelanggan yang diminta", async () => {
      const lain = await buatCustomer({
        name: "Lain",
        whatsapp: "081233334444",
      });
      await buatDesign(customer._id, { uploaded_by: adminUser._id });
      await buatDesign(customer._id, { uploaded_by: adminUser._id });
      await buatDesign(lain._id, { uploaded_by: adminUser._id });

      const res = await request(app)
        .get(`${URL}?customer_id=${customer._id}`)
        .set("Authorization", `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
      expect(
        res.body.data.every((d) => d.customer_id === customer._id.toString())
      ).toBe(true);
    });

    it("wajib menyertakan customer_id (400 tanpa itu)", async () => {
      const res = await request(app)
        .get(URL)
        .set("Authorization", `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(400);
    });

    it("menyaring galeri dengan search (label / nama file, case-insensitive)", async () => {
      await buatDesign(customer._id, {
        uploaded_by: adminUser._id,
        label: "Logo Depan",
        original_name: "logo-depan.png",
      });
      await buatDesign(customer._id, {
        uploaded_by: adminUser._id,
        label: "Punggung v2",
        original_name: "punggung-v2.png",
      });
      await buatDesign(customer._id, {
        uploaded_by: adminUser._id,
        label: "Stiker",
        original_name: "logo-kecil.png", // cocok "logo" lewat nama file
      });

      // "logo" cocok ke label "Logo Depan" DAN nama file "logo-kecil.png".
      const res = await request(app)
        .get(`${URL}?customer_id=${customer._id}&search=logo`)
        .set("Authorization", `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBe(2);
      const labels = res.body.data.map((d) => d.label).sort();
      expect(labels).toEqual(["Logo Depan", "Stiker"]);
    });

    it("search tanpa hasil mengembalikan daftar kosong (total 0)", async () => {
      await buatDesign(customer._id, {
        uploaded_by: adminUser._id,
        label: "Logo Depan",
      });

      const res = await request(app)
        .get(`${URL}?customer_id=${customer._id}&search=zzz-tidak-ada`)
        .set("Authorization", `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });

    it("DESIGNER boleh membaca galeri, PRODUKSI ditolak (403)", async () => {
      const okReq = await request(app)
        .get(`${URL}?customer_id=${customer._id}`)
        .set("Authorization", `Bearer ${tokenDesigner}`);
      expect(okReq.status).toBe(200);

      const ditolak = await request(app)
        .get(`${URL}?customer_id=${customer._id}`)
        .set("Authorization", `Bearer ${tokenProduksi}`);
      expect(ditolak.status).toBe(403);
    });
  });

  describe("DELETE /designs/:id", () => {
    it("ADMIN menghapus desain yang belum dipakai order", async () => {
      const design = await buatDesign(customer._id, {
        uploaded_by: adminUser._id,
      });

      const res = await request(app)
        .delete(`${URL}/${design._id}`)
        .set("Authorization", `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(await DesignModel.findById(design._id)).toBeNull();
    });

    it("menolak menghapus desain yang masih dipakai order (409)", async () => {
      const design = await buatDesign(customer._id, {
        uploaded_by: adminUser._id,
      });
      // Order yang memakai desain ini (dibuat langsung lewat model).
      await OrderModel.create({
        kode_order: "DTF/220826/900",
        jenis: "DTF",
        customer_id: customer._id,
        design_ids: [design._id],
        file_count: 1,
        total_qty: 5,
        tgl_order: new Date(),
        seq_harian: 900,
        status: STATUS.ANTRI_DESAIN,
        created_by: adminUser._id,
      });

      const res = await request(app)
        .delete(`${URL}/${design._id}`)
        .set("Authorization", `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(409);
      // dokumen desain tetap ada
      expect(await DesignModel.findById(design._id)).not.toBeNull();
    });

    it("menolak role DESIGNER menghapus (403)", async () => {
      const design = await buatDesign(customer._id, {
        uploaded_by: adminUser._id,
      });
      const res = await request(app)
        .delete(`${URL}/${design._id}`)
        .set("Authorization", `Bearer ${tokenDesigner}`);
      expect(res.status).toBe(403);
    });

    it("404 untuk desain yang tidak ada", async () => {
      const res = await request(app)
        .delete(`${URL}/64b7f0000000000000000000`)
        .set("Authorization", `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(404);
    });
  });
});
