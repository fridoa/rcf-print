import { cn } from "@/shared/lib/cn";

/**
 * Kartu statistik dengan aksen warna + ikon opsional. Dibuat lebih "hidup"
 * dari kotak polos: strip warna kiri, angka besar, dan subteks.
 *
 * Props:
 *   label   : judul kecil di atas.
 *   value   : angka/teks besar.
 *   sub     : keterangan kecil di bawah (opsional).
 *   icon    : elemen ikon (mis. lucide) (opsional).
 *   tone    : skema warna aksen — brand | success | warning | danger | slate.
 *   onClick : jika ada, kartu jadi tombol (untuk navigasi ke daftar terkait).
 */
const TONE = {
  brand: { bar: "bg-brand-500", icon: "bg-brand-50 text-brand-600" },
  success: { bar: "bg-emerald-500", icon: "bg-emerald-50 text-emerald-600" },
  warning: { bar: "bg-amber-500", icon: "bg-amber-50 text-amber-600" },
  danger: { bar: "bg-danger-500", icon: "bg-danger-50 text-danger-600" },
  slate: { bar: "bg-slate-400", icon: "bg-slate-100 text-slate-600" },
};

export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = "brand",
  onClick,
  className,
}) {
  const skema = TONE[tone] ?? TONE.brand;
  const clickable = typeof onClick === "function";
  const Tag = clickable ? "button" : "div";

  return (
    <Tag
      type={clickable ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-4 overflow-hidden rounded-xl bg-white p-4 text-left ring-1 ring-slate-200",
        clickable &&
          "transition hover:ring-brand-300 hover:shadow-sm focus:outline focus:outline-2 focus:outline-brand-500",
        className
      )}
    >
      {/* Strip warna aksen di tepi kiri. */}
      <span
        className={cn("absolute inset-y-0 left-0 w-1.5", skema.bar)}
        aria-hidden="true"
      />

      {Icon && (
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
            skema.icon
          )}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
      )}

      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 text-2xl font-semibold text-slate-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      </div>
    </Tag>
  );
}
