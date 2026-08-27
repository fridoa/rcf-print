import * as Yup from "yup";
import { ROLE_LIST } from "../auth/auth.constant.js";

/**
 * Validator manajemen user (khusus ADMIN).
 *
 * Berbeda dari edit-profile di modul auth: di sini admin boleh mengatur
 * `role` dan `isActive` user LAIN. Field itu sengaja tidak ada di
 * editProfileSchema supaya user biasa tidak bisa menaikkan hak aksesnya
 * sendiri — pemisahan itu tetap dijaga dengan memisah file validator.
 *
 * Aturan username/email/password dibuat konsisten dengan auth.validator.js
 * dan user.model.js: lowercase, panjang minimum sama, pola karakter sama.
 */

const nameField = Yup.string()
  .trim()
  .min(3, "Nama minimal 3 karakter")
  .max(60, "Nama maksimal 60 karakter");

const usernameField = Yup.string()
  .trim()
  .lowercase()
  .min(3, "Username minimal 3 karakter")
  .max(30, "Username maksimal 30 karakter")
  .matches(
    /^[a-z0-9._-]+$/,
    "Username hanya boleh huruf, angka, titik, garis bawah, dan tanda hubung"
  )
  // tanda @ dilarang supaya username tidak menyerupai email milik orang lain
  .test("tanpa-at", "Username tidak boleh mengandung tanda @", (v) =>
    v === undefined ? true : !v.includes("@")
  );

const emailField = Yup.string()
  .trim()
  .lowercase()
  .email("Format email tidak valid")
  .max(120, "Email maksimal 120 karakter");

const passwordField = Yup.string()
  .min(6, "Password minimal 6 karakter")
  .max(72, "Password maksimal 72 karakter"); // bcrypt hanya membaca 72 byte pertama

const roleField = Yup.string().oneOf(
  ROLE_LIST,
  `Role harus salah satu dari: ${ROLE_LIST.join(", ")}`
);

/**
 * POST /users — admin membuat user baru.
 * name, username, email, password, role wajib; isActive opsional (default
 * true di model).
 */
export const createUserSchema = Yup.object({
  name: nameField.required("Nama wajib diisi"),
  username: usernameField.required("Username wajib diisi"),
  email: emailField.required("Email wajib diisi"),
  password: passwordField.required("Password wajib diisi"),
  role: roleField.required("Role wajib diisi"),
  isActive: Yup.boolean(),
});

/**
 * PATCH /users/:id — partial, sama pola dengan modul lain:
 * field yang dikirim tidak boleh string kosong, dan body kosong ditolak.
 *
 * password TIDAK ada di sini. Reset password punya endpoint sendiri
 * (PATCH /users/:id/reset-password) supaya tidak tercampur dengan
 * perubahan profil biasa, dan supaya body edit user tidak sengaja
 * membawa password polos yang ikut ter-log.
 */
export const updateUserSchema = Yup.object({
  name: nameField,
  username: usernameField,
  email: emailField,
  role: roleField,
  isActive: Yup.boolean(),
})
  .test("tidak-kosong", "Field yang dikirim tidak boleh kosong", (value, ctx) => {
    const kosong = Object.entries(value ?? {})
      .filter(([, v]) => typeof v === "string" && v.trim() === "")
      .map(([k]) => k);

    if (kosong.length === 0) return true;

    return ctx.createError({
      message: `Field berikut tidak boleh kosong: ${kosong.join(", ")}`,
    });
  })
  .test(
    "minimal-satu-field",
    "Kirim minimal satu field yang ingin diubah",
    (value) => Object.values(value ?? {}).some((v) => v !== undefined)
  );

/** PATCH /users/:id/reset-password — admin menyetel password baru. */
export const resetPasswordSchema = Yup.object({
  newPassword: passwordField.required("Password baru wajib diisi"),
});

/**
 * Query daftar user.
 *
 * search mencari di nama, username, dan email. Filter role dan isActive
 * opsional supaya layar admin bisa menyaring (mis. "hanya PRODUKSI yang
 * nonaktif"). isActive diterima sebagai string "true"/"false" dari query
 * string dan dikonversi ke boolean.
 */
export const listUserQuerySchema = Yup.object({
  search: Yup.string().trim().default(""),
  role: roleField, // undefined = semua role
  isActive: Yup.boolean()
    .transform((value, original) => {
      if (original === undefined || original === "") return undefined;
      if (original === "true") return true;
      if (original === "false") return false;
      return value;
    })
    .typeError("isActive harus true atau false"),
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
    .default(20),
  sort: Yup.string()
    .oneOf(
      ["name", "-name", "createdAt", "-createdAt"],
      "sort harus salah satu dari: name, -name, createdAt, -createdAt"
    )
    .default("-createdAt"),
});
