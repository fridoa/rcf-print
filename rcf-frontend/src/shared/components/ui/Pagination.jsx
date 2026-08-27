import { Button } from "@/shared/components/ui";

/**
 * Kontrol paginasi reusable: tombol Sebelumnya/Berikutnya, info halaman
 * ("Halaman X dari Y"), dan opsional pemilih jumlah baris per halaman (limit).
 *
 * Dipakai di semua daftar (Pelanggan, Pengguna, Pesanan, Rekap) supaya
 * perilaku & tampilannya konsisten dan tidak lagi di-copy-paste per halaman.
 *
 * Komponen ini presentational murni: ia tidak tahu soal query string atau
 * React Query. Pemanggil yang memegang state `page`/`limit` dan memutakhirkan
 * lewat onPageChange/onLimitChange. Dengan begitu ia gampang dites dan bebas
 * dipakai baik oleh paginasi server (Pelanggan/Pengguna/Pesanan) maupun
 * client-side (Rekap).
 *
 * Menyembunyikan diri sendiri kalau hanya ada satu halaman DAN pemilih limit
 * tidak dipakai — supaya daftar pendek tidak menampilkan kontrol sia-sia.
 * Bila onLimitChange diberikan, kontrol tetap tampil (user mungkin ingin
 * menaikkan limit walau baris sekarang sedikit).
 *
 * @param {object}   props
 * @param {number}   props.page           halaman aktif (1-based)
 * @param {number}   props.totalPages      total halaman
 * @param {number}   [props.total]         total item (untuk teks "N item")
 * @param {Function} props.onPageChange    (halamanBaru) => void
 * @param {number}   [props.limit]         baris per halaman (jika pemilih dipakai)
 * @param {Function} [props.onLimitChange] (limitBaru:number) => void
 * @param {number[]} [props.limitOptions]  pilihan limit
 * @param {boolean}  [props.disabled]      matikan semua kontrol (mis. saat loading)
 */
export function Pagination({
  page,
  totalPages = 1,
  total,
  onPageChange,
  limit,
  onLimitChange,
  limitOptions = [10, 20, 50, 100],
  disabled = false,
}) {
  const showLimit = typeof onLimitChange === "function";

  // Tidak ada yang perlu ditampilkan: satu halaman & tanpa pemilih limit.
  if (totalPages <= 1 && !showLimit) return null;

  const bisaMundur = page > 1 && !disabled;
  const bisaMaju = page < totalPages && !disabled;

  return (
    <nav
      aria-label="Navigasi halaman"
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
    >
      {/* Kiri: pemilih limit + total item */}
      <div className="flex items-center gap-3 text-sm text-slate-500">
        {showLimit && (
          <label className="flex items-center gap-2">
            <span>Tampil</span>
            <select
              value={limit}
              disabled={disabled}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="rounded-lg border border-hairline bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:opacity-60"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span>baris</span>
          </label>
        )}
        {typeof total === "number" && <span>{total} data</span>}
      </div>

      {/* Kanan: navigasi halaman */}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          disabled={!bisaMundur}
          onClick={() => onPageChange(page - 1)}
        >
          Sebelumnya
        </Button>

        <p className="text-sm text-slate-500">
          Halaman {page} dari {Math.max(totalPages, 1)}
        </p>

        <Button
          variant="secondary"
          size="sm"
          disabled={!bisaMaju}
          onClick={() => onPageChange(page + 1)}
        >
          Berikutnya
        </Button>
      </div>
    </nav>
  );
}
