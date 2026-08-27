import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { rekapApi } from "../api/rekap.api";

/** Kunci cache rekap; params ikut jadi bagian key supaya ganti rentang refetch. */
export const rekapKeys = {
  all: ["rekap"],
  harian: (params) => ["rekap", "harian", params],
};

/**
 * Rekap harian dengan rentang tanggal.
 *
 * keepPreviousData: saat admin mengganti rentang, tabel lama tetap tampil
 * sampai data baru datang — tidak berkedip kosong.
 */
export function useRekapHarian(params) {
  return useQuery({
    queryKey: rekapKeys.harian(params),
    queryFn: () => rekapApi.harian(params),
    placeholderData: keepPreviousData,
  });
}
