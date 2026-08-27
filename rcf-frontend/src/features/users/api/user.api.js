import { apiClient } from "@/shared/api/client";

/**
 * Pembungkus endpoint modul users di backend
 * (backend/src/modules/users/user.route.js). Semua endpoint di sana
 * khusus ADMIN — guard sebenarnya di server, di sini hanya pemetaan HTTP.
 *
 * apiClient sudah mengembalikan response.data, jadi yang diterima di sini
 * adalah body { success, message, data, pagination? }. Pola pengupasan
 * dibuat sama dengan customer.api supaya konsisten.
 */
export const userApi = {
  /** GET /users -> { items, pagination } */
  async list({
    search = "",
    role,
    isActive,
    page = 1,
    limit = 20,
    sort = "-createdAt",
  } = {}) {
    // role & isActive hanya dikirim kalau ada nilainya, supaya tidak
    // mengirim "role=" kosong yang ditolak validator backend.
    const params = { search, page, limit, sort };
    if (role) params.role = role;
    if (isActive !== undefined && isActive !== "") params.isActive = isActive;

    const body = await apiClient.get("/users", { params });
    return { items: body.data, pagination: body.pagination };
  },

  /** GET /users/:id -> user */
  async detail(id) {
    const body = await apiClient.get(`/users/${id}`);
    return body.data;
  },

  /** POST /users -> user baru */
  async create(payload) {
    const body = await apiClient.post("/users", payload);
    return body.data;
  },

  /** PATCH /users/:id -> user terbaru (partial) */
  async update({ id, ...payload }) {
    const body = await apiClient.patch(`/users/${id}`, payload);
    return body.data;
  },

  /** PATCH /users/:id/reset-password -> hanya message */
  async resetPassword({ id, newPassword }) {
    const body = await apiClient.patch(`/users/${id}/reset-password`, {
      newPassword,
    });
    return body.message;
  },

  /** DELETE /users/:id -> hanya message */
  async remove(id) {
    const body = await apiClient.delete(`/users/${id}`);
    return body.message;
  },
};
