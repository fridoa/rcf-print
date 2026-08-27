import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { designApi } from "../api/design.api";

/** Kunci cache satu tempat supaya invalidate tidak salah tulis string. */
export const designKeys = {
  all: ["designs"],
  // Galeri di-cache per-pelanggan + kata kunci + halaman: memilih
  // pelanggan/kata-kunci/halaman lain memuat cache lain, dan menambah desain
  // hanya perlu me-refresh galeri pelanggan itu (invalidate pakai prefix
  // ["designs","list",customerId]).
  list: (customerId, params = {}) => [
    "designs",
    "list",
    customerId,
    params.search ?? "",
    params.page ?? 1,
    params.limit ?? 24,
  ],
};

/**
 * Galeri desain milik satu pelanggan, dengan paginasi + pencarian opsional.
 *
 * enabled: query baru jalan setelah ada customer_id — di form order, galeri
 * kosong sampai pelanggan dipilih (galeri per-customer). keepPreviousData
 * supaya thumbnail lama tidak berkedip saat re-fetch usai upload / ganti
 * halaman / mengetik pencarian.
 *
 * @param {string} customerId
 * @param {{search?: string, page?: number, limit?: number}} [params]
 */
export function useDesigns(customerId, params = {}) {
  return useQuery({
    queryKey: designKeys.list(customerId, params),
    queryFn: () => designApi.list({ customer_id: customerId, ...params }),
    enabled: Boolean(customerId),
    placeholderData: keepPreviousData,
  });
}
