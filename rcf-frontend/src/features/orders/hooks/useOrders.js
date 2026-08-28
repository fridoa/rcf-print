import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { orderApi } from "../api/order.api";

/** Kunci cache satu tempat supaya invalidate tidak salah tulis string. */
export const orderKeys = {
  all: ["orders"],
  list: (params) => ["orders", "list", params],
  infinite: (params) => ["orders", "infinite", params],
  detail: (id) => ["orders", "detail", id],
  riwayat: (id) => ["orders", "riwayat", id],
  statistik: () => ["orders", "statistik"],
};

/**
 * Daftar order dengan filter + paginasi.
 *
 * keepPreviousData: saat halaman/filter berubah, tabel lama tetap tampil
 * sampai data baru datang — tanpa ini tabel berkedip kosong tiap ketikan
 * pencarian atau ganti filter.
 *
 * Tiap layar kerja (Desain/Cetak/Polyflex/Packing) memanggil hook ini
 * dengan params berbeda; queryKey ikut params jadi cache-nya terpisah.
 */
export function useOrders(params, options = {}) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => orderApi.list(params),
    placeholderData: keepPreviousData,
    ...options,
  });
}

/**
 * Versi infinite scroll daftar order (dipakai di HP). Memuat halaman
 * berikutnya sambil menambah, bukan mengganti. Lihat catatan getNextPageParam
 * di useInfiniteCustomers.
 */
export function useInfiniteOrders({ limit = 10, ...filter } = {}, options = {}) {
  return useInfiniteQuery({
    queryKey: orderKeys.infinite({ ...filter, limit }),
    queryFn: ({ pageParam = 1 }) =>
      orderApi.list({ ...filter, page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const p = lastPage.pagination;
      return p && p.page < p.totalPages ? p.page + 1 : undefined;
    },
    ...options,
  });
}

/** Detail satu order. */
export function useOrder(id) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => orderApi.detail(id),
    enabled: Boolean(id),
  });
}

/** Riwayat status satu order (timeline). Hanya diambil saat id ada. */
export function useOrderRiwayat(id) {
  return useQuery({
    queryKey: orderKeys.riwayat(id),
    queryFn: () => orderApi.riwayat(id),
    enabled: Boolean(id),
  });
}

/**
 * Statistik dashboard (agregat sisi server).
 *
 * staleTime 60 detik: angka dashboard tidak perlu real-time per detik, dan ini
 * mencegah refetch tiap kali user bolak-balik ke dashboard.
 */
export function useOrderStatistik() {
  return useQuery({
    queryKey: orderKeys.statistik(),
    queryFn: () => orderApi.statistik(),
    staleTime: 60_000,
  });
}
