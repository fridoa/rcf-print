import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { userApi } from "../api/user.api";

/** Kunci cache satu tempat supaya invalidate tidak salah tulis string. */
export const userKeys = {
  all: ["users"],
  list: (params) => ["users", "list", params],
  infinite: (params) => ["users", "infinite", params],
  detail: (id) => ["users", "detail", id],
};

/**
 * Daftar user dengan pencarian + filter + paginasi.
 *
 * keepPreviousData: saat halaman/kata kunci/filter berubah, tabel lama tetap
 * tampil sampai data baru datang — tanpa ini tabel berkedip kosong setiap
 * ketikan pencarian.
 */
export function useUsers(params, options = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userApi.list(params),
    placeholderData: keepPreviousData,
    ...options,
  });
}

/** Versi infinite scroll (dipakai di HP). Lihat catatan di useInfiniteCustomers. */
export function useInfiniteUsers({ limit = 10, ...filter } = {}, options = {}) {
  return useInfiniteQuery({
    queryKey: userKeys.infinite({ ...filter, limit }),
    queryFn: ({ pageParam = 1 }) =>
      userApi.list({ ...filter, page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const p = lastPage.pagination;
      return p && p.page < p.totalPages ? p.page + 1 : undefined;
    },
    ...options,
  });
}
