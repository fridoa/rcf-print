import { apiClient } from "@/shared/api/client";

/**
 * Pembungkus endpoint modul rekap
 * (backend/src/modules/rekap/rekap.route.js).
 *
 * Pola pengupasan sama dengan order.api / customer.api: apiClient sudah
 * mengembalikan response body, jadi di sini tinggal ambil body.data yang
 * berisi { rentang, baris, total }.
 */
export const rekapApi = {
  /**
   * GET /rekap/harian -> { rentang, baris, total }
   *
   * dari & sampai berupa string "YYYY-MM-DD" (opsional). Param kosong tidak
   * dikirim supaya validator backend tidak menolak "dari=".
   */
  async harian({ dari, sampai } = {}) {
    const params = {};
    if (dari) params.dari = dari;
    if (sampai) params.sampai = sampai;

    const body = await apiClient.get("/rekap/harian", { params });
    return body.data;
  },
};
