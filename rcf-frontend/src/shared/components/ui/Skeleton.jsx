import { cn } from "@/shared/lib/cn";

/**
 * Primitive skeleton — kotak abu-abu berdenyut untuk placeholder saat loading.
 *
 * Nol dependency: cukup util Tailwind `animate-pulse`. Bentuk (tinggi/lebar/
 * radius) diatur lewat className supaya tiap pemakai bisa meniru bentuk konten
 * aslinya (baris teks, avatar, thumbnail).
 *
 * aria-hidden: skeleton bukan konten nyata, jadi disembunyikan dari screen
 * reader. Kontainer yang memuatnya sebaiknya menandai aria-busy.
 */
export function Skeleton({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block animate-pulse rounded bg-slate-200",
        className
      )}
    />
  );
}

/**
 * Skeleton untuk daftar tabel (desktop, md+) + daftar kartu (HP). Meniru
 * bentuk hasil OrderTable/CustomerTable/UserTable supaya transisi loading →
 * data tidak "melompat".
 *
 * @param {object} props
 * @param {number} [props.rows=5]     jumlah baris/kartu tiruan
 * @param {number} [props.columns=4]  jumlah kolom tiruan di tabel
 * @param {boolean}[props.action=true] sisakan kolom aksi di kanan
 */
export function TableSkeleton({ rows = 5, columns = 4, action = true }) {
  const kolom = Array.from({ length: columns });
  const baris = Array.from({ length: rows });

  return (
    <div role="status" aria-busy="true" aria-label="Memuat data">
      {/* Desktop: kerangka tabel */}
      <div className="hidden overflow-hidden rounded-lg bg-white ring-1 ring-slate-200 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              {kolom.map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
              {action && (
                <th className="px-4 py-3">
                  <Skeleton className="ml-auto h-3 w-10" />
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {baris.map((_, r) => (
              <tr key={r}>
                {kolom.map((_, c) => (
                  <td key={c} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-[8rem]" />
                  </td>
                ))}
                {action && (
                  <td className="px-4 py-3">
                    <Skeleton className="ml-auto h-8 w-20" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* HP: kerangka daftar kartu */}
      <ul className="space-y-3 md:hidden">
        {baris.map((_, r) => (
          <li
            key={r}
            className="rounded-lg bg-white p-4 ring-1 ring-slate-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </li>
        ))}
      </ul>

      <span className="sr-only">Memuat data...</span>
    </div>
  );
}

/**
 * Skeleton grid kartu — untuk dashboard (kumpulan StatTile/Panel). Meniru
 * susunan kartu ringkasan supaya area tidak "melompat" saat statistik masuk.
 *
 * @param {object} props
 * @param {number} [props.tiles=4]  jumlah kartu kecil di baris atas
 * @param {number} [props.panels=2] jumlah panel besar di bawahnya
 */
export function CardsSkeleton({ tiles = 4, panels = 2 }) {
  return (
    <div role="status" aria-busy="true" aria-label="Memuat ringkasan">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: tiles }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-white p-4 ring-1 ring-slate-200"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-16" />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: panels }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-white p-4 ring-1 ring-slate-200"
          >
            <Skeleton className="h-4 w-32" />
            <div className="mt-4 flex items-end justify-center gap-4">
              <Skeleton className="h-32 w-32 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Memuat ringkasan...</span>
    </div>
  );
}
