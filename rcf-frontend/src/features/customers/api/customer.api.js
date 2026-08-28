import { apiClient } from "@/shared/api/client";

/**
 * Pembungkus endpoint modul customers di backend
 * (backend/src/modules/customers/customer.route.js).
 *
 * apiClient sudah mengembalikan response.data, jadi yang diterima di sini
 * adalah body { success, message, data, pagination? }.
 *
 * Catatan: khusus list, body dikembalikan hampir apa adanya karena
 * `pagination` ada di luar `data` — kalau di sini ikut dikupas jadi
 * `body.data` saja, info total/halaman hilang.
 */
export const customerApi = {
  /** GET /customers -> { items, pagination } */
  async list({ search = "", page = 1, limit = 10, sort = "-createdAt" } = {}) {
    const body = await apiClient.get("/customers", {
      params: { search, page, limit, sort },
    });

    return { items: body.data, pagination: body.pagination };
  },

  /** GET /customers/:id -> customer */
  async detail(id) {
    const body = await apiClient.get(`/customers/${id}`);
    return body.data;
  },

  /** POST /customers -> customer baru */
  async create(payload) {
    const body = await apiClient.post("/customers", payload);
    return body.data;
  },

  /** PATCH /customers/:id -> customer terbaru (partial) */
  async update({ id, ...payload }) {
    const body = await apiClient.patch(`/customers/${id}`, payload);
    return body.data;
  },

  /** DELETE /customers/:id -> hanya message */
  async remove(id) {
    const body = await apiClient.delete(`/customers/${id}`);
    return body.message;
  },
};
