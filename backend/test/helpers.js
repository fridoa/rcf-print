import UserModel from "../src/modules/auth/user.model.js";
import CustomerModel from "../src/modules/customers/customer.model.js";
import OrderModel from "../src/modules/orders/order.model.js";
import DesignModel from "../src/modules/designs/design.model.js";
import { ROLES } from "../src/modules/auth/auth.constant.js";
import { STATUS } from "../src/modules/orders/order.constant.js";

/**
 * Bikin user untuk keperluan test.
 * Password sengaja dilewatkan mentah — hashing terjadi di pre-save hook.
 */
export const buatUser = async (override = {}) => {
  const data = {
    name: "User Test",
    username: "usertest",
    email: "usertest@rcfprint.com",
    password: "rahasia123",
    role: ROLES.ADMIN,
    ...override,
  };

  const user = await UserModel.create(data);
  // kembalikan juga password mentah supaya test bisa login
  return { user, passwordMentah: data.password };
};

/** Login lewat API dan kembalikan token-nya. */
export const loginDapatToken = async (request, app, identifier, password) => {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ identifier, password });

  return res.body?.data?.token;
};

/**
 * Bikin user + langsung ambil tokennya.
 * Dipakai test modul lain yang hanya butuh "token milik role X".
 */
export const buatUserDanToken = async (request, app, override = {}) => {
  const { user, passwordMentah } = await buatUser(override);
  const token = await loginDapatToken(
    request,
    app,
    user.username,
    passwordMentah
  );

  return { user, token, passwordMentah };
};

/** Bikin pelanggan untuk keperluan test. */
export const buatCustomer = async (override = {}) => {
  return CustomerModel.create({
    name: "Budi Santoso",
    whatsapp: "081234567890",
    ...override,
  });
};

/**
 * Bikin desain di galeri seorang pelanggan langsung lewat model (melewati
 * upload/storage). Dipakai test order yang butuh design_ids valid milik
 * pelanggan tertentu. hash dibuat unik-ish supaya tidak bentrok unique index
 * {customer_id, hash}; override kalau test butuh menguji dedup.
 */
let seqDesign = 0;
export const buatDesign = async (customerId, override = {}) => {
  seqDesign += 1;
  const base = {
    customer_id: customerId,
    label: `Desain ${seqDesign}`,
    hash: `hash_test_${seqDesign}_${Date.now()}`,
    file_id: `file_${seqDesign}`,
    url: `https://ik.local/test/desain-${seqDesign}.png`,
    thumbnail_url: `https://ik.local/test/desain-${seqDesign}.png?tr=w-200`,
    original_name: `desain-${seqDesign}.png`,
    size: 1024,
    uploaded_by: null,
    ...override,
  };
  return DesignModel.create(base);
};

/**
 * Bikin order langsung lewat model (melewati service & penomoran).
 * Dipakai test yang butuh order pada status tertentu sebagai titik awal.
 * kode_order/seq_harian diberi nilai default yang unik-ish; override kalau
 * test butuh nilai spesifik.
 */
let seqTest = 0;
export const buatOrder = async (override = {}) => {
  seqTest += 1;
  const base = {
    kode_order: `DTF/220826/${String(seqTest).padStart(3, "0")}`,
    jenis: "DTF",
    tgl_order: new Date("2026-08-22T00:00:00+07:00"),
    seq_harian: seqTest,
    status: STATUS.ANTRI_DESAIN,
    catatan: "",
  };
  return OrderModel.create({ ...base, ...override });
};
