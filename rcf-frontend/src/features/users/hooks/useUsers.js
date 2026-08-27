import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { userApi } from "../api/user.api";

/** Kunci cache satu tempat supaya invalidate tidak salah tulis string. */
export const userKeys = {
  all: ["users"],
  list: (params) => ["users", "list", params],
  detail: (id) => ["users", "detail", id],
};

/**
 * Daftar user dengan pencarian + filter + paginasi.
 *
 * keepPreviousData: saat halaman/kata kunci/filter berubah, tabel lama tetap
 * tampil sampai data baru datang — tanpa ini tabel berkedip kosong setiap
 * ketikan pencarian.
 */
export function useUsers(params) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userApi.list(params),
    placeholderData: keepPreviousData,
  });
}
