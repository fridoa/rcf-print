import { cn } from "@/shared/lib/cn";

/**
 * Daftar bar horizontal — alternatif ringan untuk "bar chart" tanpa library.
 * Tiap baris: label, nilai, dan bar yang panjangnya proporsional terhadap
 * nilai maksimum. Cocok untuk "antrian per status" atau "qty per jenis".
 *
 * Props:
 *   items: [{ label, value, color? }]. color = kelas Tailwind bg-* (opsional,
 *          default brand). max: nilai acuan 100% (opsional; default nilai
 *          terbesar di items — minimal 1 supaya tidak bagi nol).
 *   emptyText: teks saat semua nol / kosong.
 */
export function BarList({ items = [], max, emptyText = "Belum ada data.", className }) {
  const nilaiMax = Math.max(max ?? 0, ...items.map((i) => i.value || 0), 1);
  const adaIsi = items.some((i) => (i.value || 0) > 0);

  if (!adaIsi) {
    return (
      <p className={cn("py-4 text-center text-sm text-slate-500", className)}>
        {emptyText}
      </p>
    );
  }

  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {items.map((it) => {
        const persen = Math.round(((it.value || 0) / nilaiMax) * 100);
        return (
          <li key={it.label}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-slate-600">{it.label}</span>
              <span className="font-medium text-slate-900">{it.value ?? 0}</span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuenow={it.value ?? 0}
              aria-valuemin={0}
              aria-valuemax={nilaiMax}
              aria-label={it.label}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  it.color ?? "bg-brand-500"
                )}
                style={{ width: `${persen}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
