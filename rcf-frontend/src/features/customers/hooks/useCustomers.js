import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { customerApi } from "../api/customer.api";

/** Kunci cache satu tempat supaya invalidate tidak salah tulis string. */
export const customerKeys = {
  all: ["customers"],
  list: (params) => ["customers", "list", params],
  detail: (id) => ["customers", "detail", id],
};

/**
 * Daftar pelanggan dengan pencarian + paginasi.
 *
 * keepPreviousData: saat halaman/kata kunci berubah, tabel lama tetap
 * tampil sampai data baru datang — tanpa ini tabel berkedip jadi kosong
 * setiap ketikan pencarian.
 */
export function useCustomers(params) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => customerApi.list(params),
    placeholderData: keepPreviousData,
  });
}
