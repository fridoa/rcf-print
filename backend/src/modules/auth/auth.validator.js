import * as Yup from "yup";

export const loginSchema = Yup.object({
  identifier: Yup.string()
    .required("Username atau email wajib diisi")
    .trim()
    .lowercase(),
  password: Yup.string().required("Password wajib diisi"),
});

/**
 * Edit profil sendiri — partial update (PATCH).
 * Semua field opsional, tapi minimal satu harus dikirim.
 *
 * Field role dan isActive sengaja TIDAK ada di sini — itu wewenang admin,
 * supaya user tidak bisa menaikkan hak aksesnya sendiri.
 */
export const editProfileSchema = Yup.object({
  name: Yup.string()
    .trim()
    .min(3, "Nama minimal 3 karakter")
    .max(60, "Nama maksimal 60 karakter"),
  username: Yup.string()
    .trim()
    .lowercase()
    .min(3, "Username minimal 3 karakter")
    .max(30, "Username maksimal 30 karakter")
    .matches(
      /^[a-z0-9._-]+$/,
      "Username hanya boleh huruf, angka, titik, garis bawah, dan tanda hubung"
    )
    // tanda @ dilarang supaya username tidak menyerupai email milik orang lain
    .test("tanpa-at", "Username tidak boleh mengandung tanda @", (v) => !v?.includes("@")),
  email: Yup.string()
    .trim()
    .lowercase()
    .email("Format email tidak valid"),
})
  // tolak string kosong: kalau field dikirim, isinya harus bermakna
  .test(
    "tidak-kosong",
    "Field yang dikirim tidak boleh kosong",
    (value, ctx) => {
      const kosong = Object.entries(value ?? {})
        .filter(([, v]) => typeof v === "string" && v.trim() === "")
        .map(([k]) => k);

      if (kosong.length === 0) return true;

      return ctx.createError({
        message: `Field berikut tidak boleh kosong: ${kosong.join(", ")}`,
      });
    }
  )
  // PATCH tanpa field apa pun tidak ada gunanya — lebih baik ditolak jelas
  .test(
    "minimal-satu-field",
    "Kirim minimal satu field: name, username, atau email",
    (value) => Object.values(value ?? {}).some((v) => v !== undefined)
  );

export const changePasswordSchema = Yup.object({
  oldPassword: Yup.string().required("Password lama wajib diisi"),
  newPassword: Yup.string()
    .required("Password baru wajib diisi")
    .min(6, "Password baru minimal 6 karakter")
    .notOneOf(
      [Yup.ref("oldPassword")],
      "Password baru tidak boleh sama dengan password lama"
    ),
  confirmPassword: Yup.string()
    .required("Konfirmasi password wajib diisi")
    .oneOf([Yup.ref("newPassword")], "Konfirmasi password tidak sama"),
});

// === Lupa katasandi ===

export const lupaPasswordSchema = Yup.object({
  email: Yup.string()
    .required("Email wajib diisi")
    .trim()
    .lowercase()
    .email("Format email tidak valid"),
});

export const verifikasiOtpSchema = Yup.object({
  email: Yup.string()
    .required("Email wajib diisi")
    .trim()
    .lowercase()
    .email("Format email tidak valid"),
  otp: Yup.string()
    .required("Kode OTP wajib diisi")
    .trim()
    .matches(/^\d{6}$/, "Kode OTP harus 6 digit angka"),
});

export const resetPasswordSchema = Yup.object({
  token: Yup.string().required("Token reset wajib diisi"),
  newPassword: Yup.string()
    .required("Password baru wajib diisi")
    .min(6, "Password baru minimal 6 karakter"),
});
