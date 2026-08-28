import * as yup from "yup";

/**
 * Skema form auth — sengaja dibuat mirror dari
 * backend/src/modules/auth/auth.validator.js.
 *
 * Validasi di sini hanya untuk UX (feedback cepat tanpa round-trip).
 * Backend tetap validasi ulang; jangan pernah anggap ini pengaman.
 */

export const loginSchema = yup.object({
  identifier: yup
    .string()
    .trim()
    .required("Username atau email wajib diisi"),
  password: yup.string().required("Password wajib diisi"),
});

/**
 * Form edit profil.
 *
 * Di backend endpointnya PATCH dan semua field opsional, tapi di FORM
 * ketiga input selalu tampil terisi nilai lama. Jadi input yang dikosongkan
 * user itu bukan "tidak dikirim", melainkan "dikosongkan" — dan backend
 * memang menolaknya (test "tidak-kosong"). Karena itu di sini required,
 * supaya errornya muncul sebelum request terkirim.
 *
 * Yang menjaga sifat partial-nya adalah komponen form: hanya field yang
 * berubah (dirtyFields) yang ikut dikirim.
 */
export const editProfileSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required("Nama wajib diisi")
    .min(3, "Nama minimal 3 karakter")
    .max(60, "Nama maksimal 60 karakter"),
  username: yup
    .string()
    .trim()
    .required("Username wajib diisi")
    .min(3, "Username minimal 3 karakter")
    .max(30, "Username maksimal 30 karakter")
    .matches(
      /^[a-zA-Z0-9._-]+$/,
      "Username hanya boleh huruf, angka, titik, garis bawah, dan tanda hubung"
    ),
  email: yup
    .string()
    .trim()
    .required("Email wajib diisi")
    .email("Format email tidak valid"),
});

/**
 * Form ubah password.
 *
 * Nama field mengikuti backend apa adanya: oldPassword / newPassword /
 * confirmPassword. Minimal 6 karakter juga mengikuti auth.validator.js —
 * kalau di FE dibuat 8, user bisa lolos di FE tapi ditolak server (atau
 * sebaliknya bingung karena FE lebih ketat tanpa alasan).
 */
export const changePasswordSchema = yup.object({
  oldPassword: yup.string().required("Password lama wajib diisi"),
  newPassword: yup
    .string()
    .required("Password baru wajib diisi")
    .min(6, "Password baru minimal 6 karakter")
    // notOneOf tidak boleh dievaluasi saat password lama kosong — di yup 1.7
    // notOneOf([ref]) menang atas required/min, jadi form kosong akan
    // menampilkan "tidak boleh sama dengan password lama" (karena '' === '')
    // alih-alih "wajib diisi". Guard .when(): aturan ini hanya aktif setelah
    // password lama terisi.
    .when("oldPassword", {
      is: (lama) => !!lama,
      then: (s) =>
        s.notOneOf(
          [yup.ref("oldPassword")],
          "Password baru tidak boleh sama dengan password lama"
        ),
    }),
  confirmPassword: yup
    .string()
    .required("Konfirmasi password wajib diisi")
    .oneOf([yup.ref("newPassword")], "Konfirmasi password tidak sama"),
});

/**
 * === Lupa katasandi ===
 * Mirror dari backend/src/modules/auth/auth.validator.js.
 */

/** Langkah 1: minta email reset dikirim. */
export const lupaPasswordSchema = yup.object({
  email: yup
    .string()
    .required("Email wajib diisi")
    .trim()
    .lowercase()
    .email("Format email tidak valid"),
});

/**
 * Langkah 2 (dari link email): password baru.
 * Tanpa confirmPassword — konfirmasi di sini hanyaUX, server tidak
 * menerimanya; cukup field ketik ulang tidak sebanding risiko salah
 * ketik yang tidak ketahuan.
 */
export const resetPasswordSchema = yup.object({
  newPassword: yup
    .string()
    .required("Password baru wajib diisi")
    .min(6, "Password baru minimal 6 karakter"),
  confirmPassword: yup
    .string()
    .required("Konfirmasi password wajib diisi")
    .oneOf([yup.ref("newPassword")], "Konfirmasi password tidak sama"),
});
