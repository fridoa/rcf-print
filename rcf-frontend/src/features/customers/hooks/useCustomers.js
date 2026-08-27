import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { customerApi } from "../api/customer.api";

/** Kunci cache satu tempat supaya invalidate tidak salah tulis string. */
export const customerKeys = {
  all: ["customers"],
  list: (params) => ["customers", "list", params],
  infinite: (params) => ["customers", "infinite", params],
  detail: (id) => ["customers", "detail", id],
};

/**
 * Daftar pelanggan dengan pencarian + paginasi.
 *
 * keepPreviousData: saat halaman/kata kunci berubah, tabel lama tetap
 * tampil sampai data baru datang — tanpa ini tabel berkedip jadi kosong
 * setiap ketikan pencarian.
 */
export function useCustomers(params, options = {}) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => customerApi.list(params),
    placeholderData: keepPreviousData,
    ...options,
  });
}

/**
 * Versi infinite scroll (dipakai di HP). Sama seperti useCustomers tapi
 * memuat halaman berikutnya sambil menambah, bukan mengganti.
 *
 * getNextPageParam: kembalikan nomor halaman berikutnya selama belum halaman
 * terakhir; undefined menandakan tidak ada lagi (hasNextPage jadi false).
 */
export function useInfiniteCustomers({ search = "", limit = 20 } = {}, options = {}) {
  return useInfiniteQuery({
    queryKey: customerKeys.infinite({ search, limit }),
    queryFn: ({ pageParam = 1 }) =>
      customerApi.list({ search, page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const p = lastPage.pagination;
      return p && p.page < p.totalPages ? p.page + 1 : undefined;
    },
    ...options,
  });
}
