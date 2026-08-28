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
    // params null = rentang tidak valid (dari > sampai, admin masih mengubah).
    // enabled mencegah query — jangan sampai request dengan rentang kosong
    // terkirim hanya karena key berubah.
    queryKey: rekapKeys.harian(params ?? {}),
    queryFn: () => rekapApi.harian(params ?? {}),
    enabled: params != null,
    placeholderData: keepPreviousData,
  });
}
