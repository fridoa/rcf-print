import * as Yup from "yup";

/**
 * Query daftar galeri desain.
 *
 * customer_id WAJIB: galeri selalu per-pelanggan, tidak ada tampilan campur
 * lintas pelanggan (keputusan galeri per-customer). page/limit untuk paginasi.
 * search opsional: cari di label ATAU nama file asli (case-insensitive) supaya
 * galeri pelanggan langganan yang besar tetap mudah ditelusuri.
 */
export const listDesignQuerySchema = Yup.object({
  customer_id: Yup.string().trim().required("customer_id wajib diisi"),
  search: Yup.string().trim().max(120, "Kata kunci maksimal 120 karakter"),
  page: Yup.number()
    .transform((v, o) => (o === "" ? undefined : v))
    .integer("page harus bilangan bulat")
    .min(1, "page minimal 1")
    .default(1),
  limit: Yup.number()
    .transform((v, o) => (o === "" ? undefined : v))
    .integer("limit harus bilangan bulat")
    .min(1, "limit minimal 1")
    .max(100, "limit maksimal 100")
    .default(50),
});

/**
 * Body upload desain. File-nya sendiri lewat multer (req.file), bukan di sini.
 * customer_id menentukan galeri mana desain ini masuk; label opsional.
 */
export const uploadDesignSchema = Yup.object({
  customer_id: Yup.string().trim().required("customer_id wajib diisi"),
  label: Yup.string().trim().max(120, "Label desain maksimal 120 karakter"),
});
