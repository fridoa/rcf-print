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
   * GET /orders -> { items, pagination, meta }
   *
   * `status` boleh berupa string tunggal ATAU array (layar produksi yang
   * menampilkan dua status). axios mengubah array jadi status=a&status=b,
   * yang ditampung backend sebagai statusIn. Param kosong tidak dikirim
   * supaya validator backend tidak menolak "jenis=".
   *
   * Rentang tanggal (halaman Pesanan): tgl_dari/tgl_sampai berbasis tgl_order,
   * inklusif. meta.aktif_di_luar_rentang memberi tahu berapa order yang belum
   * selesai tersaring keluar oleh rentang; sertakan_aktif_luar=true menariknya
   * kembali ke daftar supaya kerjaan lama tidak hilang dari layar.
   */
  async list({
    jenis,
    status,
    aktif,
    customer_id,
    search = "",
    tgl,
    tgl_dari,
    tgl_sampai,
    sertakan_aktif_luar,
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
    if (tgl_dari) params.tgl_dari = tgl_dari;
    if (tgl_sampai) params.tgl_sampai = tgl_sampai;
    if (sertakan_aktif_luar) params.sertakan_aktif_luar = true;

    const body = await apiClient.get("/orders", { params });
    return { items: body.data, pagination: body.pagination, meta: body.meta };
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

  /**
   * GET /orders/tertahan -> { ambang_hari, total, per_status, items }
   *
   * Order yang sudah terlalu lama diam di status sekarang — status APA PUN
   * (desain, cetak, cutting, packing, atau READY yang belum diambil). `items`
   * adalah daftar order konkret beserta status & status_sejak-nya; `per_status`
   * hitungan penuh per langkah, jadi total bisa lebih besar dari items.length.
   */
  async tertahan({ ambang_hari, limit } = {}) {
    const params = {};
    if (ambang_hari) params.ambang_hari = ambang_hari;
    if (limit) params.limit = limit;

    const body = await apiClient.get("/orders/tertahan", { params });
    return body.data;
  },

  /** POST /orders -> order baru (ADMIN) */
  async create(payload) {
    const body = await apiClient.post("/orders", payload);
    return body.data;
  },

  /**
   * PATCH /orders/:id/status -> majukan satu langkah.
   * payload: { catatan? } untuk transisi produksi/packing, dan
   * { file_count, total_qty, catatan? } saat designer menandai desain selesai
   * (backend mewajibkan kedua angka untuk transisi keluar ANTRI_DESAIN).
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

  /** PATCH /orders/:id -> ubah data order (ADMIN) */
  async update({ id, ...payload }) {
    const body = await apiClient.patch(`/orders/${id}`, payload);
    return body.data;
  },

  /** DELETE /orders/:id -> hapus order (ADMIN) */
  async remove(id) {
    const body = await apiClient.delete(`/orders/${id}`);
    return body.data;
  },
};

