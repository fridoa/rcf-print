import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  DateRangePickerField,
  InfiniteScroll,
  Pagination,
  Spinner,
  TableSkeleton,
} from "@/shared/components/ui";
import { useIsDesktop } from "@/shared/hooks/useMediaQuery";
import { formatRupiah, formatTanggal } from "@/shared/lib/format";
import { useRekapHarian } from "../hooks/useRekap";

/** "YYYY-MM-DD" untuk value <input type=date>, dalam kalender lokal. */
const toInputDate = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/** Default rentang: tanggal 1 bulan ini s/d hari ini. */
const defaultRange = () => {
  const now = new Date();
  return {
    dari: toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    sampai: toInputDate(now),
  };
};

/**
 * Halaman Rekap Data (khusus ADMIN).
 *
 * Menampilkan pemasukan harian dari order SELESAI dalam rentang tanggal.
 * Kolom sesuai mockup: Tanggal, Pelanggan, File, Qty, Cash, Transfer — plus
 * kolom Total per baris dan satu baris TOTAL di kaki tabel.
 *
 * Basis tanggal = selesai_at (tanggal pembayaran diterima), ditentukan di
 * backend. Rentang default = bulan berjalan.
 *
 * Paginasi di sini CLIENT-SIDE: backend mengembalikan seluruh baris harian
 * untuk rentang sekaligus (jumlahnya kecil, maksimal sebanyak hari dalam
 * rentang), jadi cukup dipotong di memori memakai komponen Pagination yang
 * sama dengan daftar lain. Baris TOTAL tetap memakai total seluruh rentang
 * dari backend, bukan total per halaman.
 */
export function RekapPage() {
  const [range, setRange] = useState(defaultRange);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Kirim ke API hanya kalau rentangnya valid (dari <= sampai) supaya tidak
  // memancing 400 saat admin masih mengetik.
  const params = useMemo(() => {
    if (range.dari && range.sampai && range.dari > range.sampai) return null;
    return { dari: range.dari, sampai: range.sampai };
  }, [range]);

  const rentangTerbalik = range.dari && range.sampai && range.dari > range.sampai;

  // null saat rentang terbalik; hook yang menolak query-nya (enabled:false).
  const { data, isLoading, isError, error } = useRekapHarian(params);

  const baris = data?.baris ?? [];
  const total = data?.total;

  // Desktop: paginasi tombol client-side (data sudah di memori). HP: infinite
  // scroll — tampilkan jumlah baris yang bertambah tiap kali user mendekati
  // bawah. Keduanya memotong array yang sama, hanya beda cara kontrolnya.
  const isDesktop = useIsDesktop();

  const totalPages = Math.max(Math.ceil(baris.length / limit), 1);

  // Berapa baris yang ditampilkan di mode HP (infinite). Bertambah per-batch.
  const [tampil, setTampil] = useState(limit);

  // Kalau rentang/limit berubah dan halaman aktif jadi di luar jangkauan
  // (mis. tadi di halaman 3, sekarang cuma 1 halaman), tarik balik ke 1.
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  // Reset jumlah tampil HP saat data (rentang) berubah supaya tidak "nyangkut"
  // menampilkan lebih banyak dari yang ada.
  useEffect(() => {
    setTampil(limit);
  }, [baris, limit]);

  const barisHalaman = useMemo(() => {
    if (isDesktop) {
      const mulai = (page - 1) * limit;
      return baris.slice(mulai, mulai + limit);
    }
    return baris.slice(0, tampil);
  }, [baris, page, limit, tampil, isDesktop]);

  const adaLagiHp = tampil < baris.length;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Rekap Data</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pemasukan harian dari order yang sudah selesai.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <DateRangePickerField
          dari={range.dari}
          sampai={range.sampai}
          onChange={(r) => {
            setPage(1);
            setRange(r);
          }}
        />
        {/* Indikator refetch ringan saat sudah ada data sebelumnya. */}
        {isLoading && baris.length > 0 && <Spinner label="Memuat rekap..." />}
      </div>

      {rentangTerbalik && (
        <Alert
          tone="error"
          title="Tanggal 'sampai' tidak boleh sebelum 'dari'."
        />
      )}

      {isError && !rentangTerbalik && (
        <Alert
          tone="error"
          title={error?.message ?? "Gagal memuat rekap."}
          messages={error?.errors ?? []}
        />
      )}

      {/* Muat awal (belum ada data): skeleton meniru bentuk tabel rekap. */}
      {isLoading && baris.length === 0 ? (
        <TableSkeleton rows={6} columns={7} action={false} />
      ) : (
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Tanggal</th>
              <th className="px-4 py-2 text-right">Pelanggan</th>
              <th className="px-4 py-2 text-right">File</th>
              <th className="px-4 py-2 text-right">Qty</th>
              <th className="px-4 py-2 text-right">Cash</th>
              <th className="px-4 py-2 text-right">Transfer</th>
              <th className="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {baris.length === 0 && !isLoading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  Tidak ada order selesai pada rentang ini.
                </td>
              </tr>
            )}

            {barisHalaman.map((b) => (
              <tr key={b.tanggal}>
                <td className="px-4 py-2 text-slate-800">
                  {formatTanggal(b.tanggal)}
                </td>
                <td className="px-4 py-2 text-right">{b.pelanggan}</td>
                <td className="px-4 py-2 text-right">{b.file}</td>
                <td className="px-4 py-2 text-right">{b.qty}</td>
                <td className="px-4 py-2 text-right">{formatRupiah(b.cash)}</td>
                <td className="px-4 py-2 text-right">
                  {formatRupiah(b.transfer)}
                </td>
                <td className="px-4 py-2 text-right font-medium text-slate-900">
                  {formatRupiah(b.cash + b.transfer)}
                </td>
              </tr>
            ))}
          </tbody>

          {total && baris.length > 0 && (
            <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-slate-900">
              <tr>
                <td className="px-4 py-2">TOTAL</td>
                <td className="px-4 py-2 text-right">{total.pelanggan}</td>
                <td className="px-4 py-2 text-right">{total.file}</td>
                <td className="px-4 py-2 text-right">{total.qty}</td>
                <td className="px-4 py-2 text-right">
                  {formatRupiah(total.cash)}
                </td>
                <td className="px-4 py-2 text-right">
                  {formatRupiah(total.transfer)}
                </td>
                <td className="px-4 py-2 text-right">
                  {formatRupiah(total.pendapatan)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      )}

      {/* Desktop: paginasi tombol client-side. HP: infinite scroll. */}
      {baris.length > 0 &&
        (isDesktop ? (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={baris.length}
            onPageChange={setPage}
            limit={limit}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        ) : (
          <InfiniteScroll
            hasNextPage={adaLagiHp}
            isFetchingNextPage={false}
            onLoadMore={() => setTampil((n) => n + limit)}
            endText="Semua baris rekap sudah dimuat."
          />
        ))}

    </section>
  );
}
