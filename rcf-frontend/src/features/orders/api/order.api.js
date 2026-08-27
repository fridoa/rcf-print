import { apiClient } from "@/shared/api/client";

/**
 * Pembungkus endpoint modul orders di backend
 * (backend/src/modules/orders/order.route.js).
 *
 * apiClient sudah mengembalikan response.data, jadi yang diterima di sini
 * adalah body { success, message, data, pagination? }. Pola pengupasan
 * dibuat sama dengan customer.api / user.api supaya konsisten.
 */
export const orderApi = {
  /**
   * GET /orders -> { items, pagination }
   *
   * `status` boleh berupa string tunggal ATAU array (layar produksi yang
   * menampilkan dua status). axios mengubah array jadi status=a&status=b,
   * yang ditampung backend sebagai statusIn. Param kosong tidak dikirim
   * supaya validator backend tidak menolak "jenis=".
   */
  async list({
    jenis,
    status,
    aktif,
    customer_id,
    search = "",
    tgl,
    page = 1,
    limit = 10,
    sort = "-createdAt",
  } = {}) {
    const params = { page, limit, sort };
    if (search) params.search = search;
    if (jenis) params.jenis = jenis;
    if (status) params.status = status; // string atau array
    if (aktif !== undefined) params.aktif = aktif;
    if (customer_id) params.customer_id = customer_id;
    if (tgl) params.tgl = tgl;

    const body = await apiClient.get("/orders", { params });
    return { items: body.data, pagination: body.pagination };
  },

  /** GET /orders/:id -> order */
  async detail(id) {
    const body = await apiClient.get(`/orders/${id}`);
    return body.data;
  },

  /** GET /orders/:id/riwayat -> status log[] */
  async riwayat(id) {
    const body = await apiClient.get(`/orders/${id}/riwayat`);
    return body.data;
  },

  /** GET /orders/statistik -> ringkasan dashboard */
  async statistik() {
    const body = await apiClient.get("/orders/statistik");
    return body.data;
  },

  /** POST /orders -> order baru (ADMIN) */
  async create(payload) {
    const body = await apiClient.post("/orders", payload);
    return body.data;
  },

  /**
   * PATCH /orders/:id/status -> majukan satu langkah.
   * payload opsional: { catatan }. file_count/total_qty tidak lagi dikirim di
   * transisi mana pun — keduanya ditetapkan saat order dibuat.
   */
  async majukanStatus({ id, ...payload }) {
    const body = await apiClient.patch(`/orders/${id}/status`, payload);
    return body.data;
  },

  /** PATCH /orders/:id/selesai -> catat pembayaran (ADMIN) */
  async selesaikan({ id, ...payload }) {
    const body = await apiClient.patch(`/orders/${id}/selesai`, payload);
    return body.data;
  },

  /** PATCH /orders/:id/koreksi -> koreksi status manual (ADMIN) */
  async koreksi({ id, ...payload }) {
    const body = await apiClient.patch(`/orders/${id}/koreksi`, payload);
    return body.data;
  },
};
