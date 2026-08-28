import { apiClient } from "@/shared/api/client";

/**
 * Pembungkus endpoint modul designs di backend
 * (backend/src/modules/designs/design.route.js) — galeri desain per-pelanggan.
 *
 * apiClient sudah mengembalikan response.data (lihat shared/api/client.js),
 * jadi yang diterima di sini adalah body { success, message, data, ... }.
 */
export const designApi = {
  /**
   * GET /designs?customer_id=...&search=... -> { items, pagination }
   *
   * customer_id WAJIB: galeri selalu per-pelanggan (backend menolak tanpa itu).
   * search opsional: cari di label/nama file (galeri besar). Dikirim hanya
   * kalau ada isinya supaya query string tetap bersih.
   */
  async list({ customer_id, search, page = 1, limit = 50 } = {}) {
    const params = { customer_id, page, limit };
    if (search) params.search = search;

    const body = await apiClient.get("/designs", { params });
    return { items: body.data, pagination: body.pagination };
  },

  /**
   * POST /designs (multipart) -> { data: design, deduped }
   *
   * Mengunggah satu file ke galeri pelanggan. Field:
   *   - file        : berkas gambar (wajib)
   *   - customer_id : galeri tujuan (wajib)
   *   - label       : label opsional
   *
   * Content-Type sengaja di-set undefined supaya axios menuliskan
   * multipart/form-data + boundary sendiri (kalau dibiarkan "application/json"
   * dari default client, backend gagal mem-parse berkasnya).
   *
   * deduped=true berarti file byte-identik sudah ada; backend mengembalikan
   * desain lama (200), bukan membuat baris baru.
   */
  async upload({ file, customer_id, label }) {
    const form = new FormData();
    form.append("file", file);
    form.append("customer_id", customer_id);
    if (label) form.append("label", label);

    // apiClient mengupas response.data lewat interceptor, jadi `body` = payload
    // JSON penuh { success, message, deduped, data }.
    const body = await apiClient.post("/designs", form, {
      headers: { "Content-Type": undefined },
    });
    return { design: body.data, deduped: Boolean(body.deduped) };
  },

  /** DELETE /designs/:id -> message (ADMIN; ditolak kalau masih dipakai order) */
  async remove(id) {
    const body = await apiClient.delete(`/designs/${id}`);
    return body.message;
  },
};
