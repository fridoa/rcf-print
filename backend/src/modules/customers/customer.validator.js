import * as Yup from "yup";
import { normalizeWhatsapp, WHATSAPP_PATTERN } from "../../utils/phone.js";

/**
 * Nomor WhatsApp: ditransformasi lebih dulu ke 62xxxxxxxxxx, baru dicek.
 * Dengan begitu "0812-3456-7890" lolos, dan yang tersimpan di database
 * sudah bentuk final — bukan tugas service untuk membersihkannya lagi.
 */
const whatsappField = Yup.string()
  .transform((value) => (value === undefined ? value : normalizeWhatsapp(value)))
  .matches(
    WHATSAPP_PATTERN,
    "Nomor WhatsApp tidak valid. Contoh: 081234567890"
  );

const nameField = Yup.string()
  .trim()
  .min(3, "Nama pelanggan minimal 3 karakter")
  .max(80, "Nama pelanggan maksimal 80 karakter");

const noteField = Yup.string()
  .trim()
  .max(200, "Catatan maksimal 200 karakter");

/** POST /customers — nama & nomor wajib, catatan opsional. */
export const createCustomerSchema = Yup.object({
  name: nameField.required("Nama pelanggan wajib diisi"),
  whatsapp: whatsappField.required("Nomor WhatsApp wajib diisi"),
  note: noteField,
});

/**
 * PATCH /customers/:id — partial, sama aturannya dengan edit-profile:
 * field yang dikirim tidak boleh kosong, dan body kosong ditolak.
 *
 * note dikecualikan dari aturan "tidak boleh kosong" karena mengosongkan
 * catatan adalah aksi yang wajar ("" = hapus catatan).
 */
export const updateCustomerSchema = Yup.object({
  name: nameField,
  whatsapp: whatsappField,
  note: noteField,
})
  .test("tidak-kosong", "Field yang dikirim tidak boleh kosong", (value, ctx) => {
    const kosong = Object.entries(value ?? {})
      .filter(([key]) => key !== "note")
      .filter(([, v]) => typeof v === "string" && v.trim() === "")
      .map(([k]) => k);

    if (kosong.length === 0) return true;

    return ctx.createError({
      message: `Field berikut tidak boleh kosong: ${kosong.join(", ")}`,
    });
  })
  .test(
    "minimal-satu-field",
    "Kirim minimal satu field: name, whatsapp, atau note",
    (value) => Object.values(value ?? {}).some((v) => v !== undefined)
  );

/**
 * Query daftar pelanggan.
 *
 * limit dibatasi maksimal 100 supaya satu request tidak bisa menarik
 * seluruh collection; default 10 per halaman.
 */
export const listCustomerQuerySchema = Yup.object({
  search: Yup.string().trim().default(""),
  page: Yup.number()
    .transform((v, original) => (original === "" ? undefined : v))
    .integer("page harus bilangan bulat")
    .min(1, "page minimal 1")
    .default(1),
  limit: Yup.number()
    .transform((v, original) => (original === "" ? undefined : v))
    .integer("limit harus bilangan bulat")
    .min(1, "limit minimal 1")
    .max(100, "limit maksimal 100")
    .default(10),
  sort: Yup.string()
    .oneOf(
      ["name", "-name", "createdAt", "-createdAt"],
      "sort harus salah satu dari: name, -name, createdAt, -createdAt"
    )
    .default("-createdAt"),
});
