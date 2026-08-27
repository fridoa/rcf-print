import * as yup from "yup";
import { ROLE_LIST } from "@/shared/constants/roles";

/**
 * Mirror dari backend/src/modules/users/user.validator.js.
 * Validasi di sini hanya untuk UX; server tetap validasi ulang.
 *
 * Aturan username/email/password/role dibuat identik dengan backend supaya
 * user tidak lolos di FE lalu ditolak server (atau sebaliknya).
 */

const nameField = yup
  .string()
  .trim()
  .required("Nama wajib diisi")
  .min(3, "Nama minimal 3 karakter")
  .max(60, "Nama maksimal 60 karakter");

const usernameField = yup
  .string()
  .trim()
  .required("Username wajib diisi")
  .min(3, "Username minimal 3 karakter")
  .max(30, "Username maksimal 30 karakter")
  .matches(
    /^[a-zA-Z0-9._-]+$/,
    "Username hanya boleh huruf, angka, titik, garis bawah, dan tanda hubung"
  );

const emailField = yup
  .string()
  .trim()
  .required("Email wajib diisi")
  .email("Format email tidak valid")
  .max(120, "Email maksimal 120 karakter");

const roleField = yup
  .string()
  .required("Role wajib diisi")
  .oneOf(ROLE_LIST, "Role tidak dikenal");

/**
 * Skema form user, dipakai untuk tambah maupun ubah.
 *
 * Password TIDAK ada di sini. Saat tambah, password digabung ke skema
 * lewat createUserSchema di bawah; saat ubah, password memang tidak boleh
 * ikut (reset password punya form sendiri). Memisah begini membuat satu
 * UserForm bisa melayani dua mode tanpa field password yang menyala/mati
 * secara kondisional.
 */
export const userSchema = yup.object({
  name: nameField,
  username: usernameField,
  email: emailField,
  role: roleField,
  isActive: yup.boolean().default(true),
});

/** Tambahan field password khusus mode tambah. */
export const createUserSchema = userSchema.shape({
  password: yup
    .string()
    .required("Password wajib diisi")
    .min(6, "Password minimal 6 karakter")
    .max(72, "Password maksimal 72 karakter"),
});

/** Form reset password oleh admin: hanya password baru. */
export const resetPasswordSchema = yup.object({
  newPassword: yup
    .string()
    .required("Password baru wajib diisi")
    .min(6, "Password baru minimal 6 karakter")
    .max(72, "Password baru maksimal 72 karakter"),
});
