import { cn } from "@/shared/lib/cn";

/**
 * Donut/pie chart murni SVG — tanpa dependensi chart eksternal, supaya stack FE
 * tetap ringan (keputusan: tidak menambah recharts/chart.js untuk beberapa
 * visual sederhana). Menggambar tiap irisan sebagai <circle> dengan
 * stroke-dasharray, teknik standar untuk donut chart tanpa menghitung path arc.
 *
 * Props:
 *   data: [{ label, value, color }] — color kelas warna stroke (hex/rgb string
 *         karena dipakai di atribut SVG, bukan kelas Tailwind).
 *   size: diameter px (default 160). thickness: tebal cincin (default 22).
 *   centerLabel / centerSub: teks di tengah (mis. total).
 *
 * Irisan dengan value 0 dilewati. Kalau semua 0, digambar cincin abu kosong.
 */
export function DonutChart({
  data = [],
  size = 160,
  thickness = 22,
  centerLabel,
  centerSub,
  className,
}) {
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  const total = data.reduce((acc, d) => acc + (d.value || 0), 0);

  // Offset berjalan: tiap irisan mulai di ujung irisan sebelumnya.
  let offsetAkumulasi = 0;
  const irisan =
    total > 0
      ? data
          .filter((d) => d.value > 0)
          .map((d) => {
            const fraksi = d.value / total;
            const panjang = fraksi * circumference;
            const seg = {
              ...d,
              dash: `${panjang} ${circumference - panjang}`,
              // stroke-dashoffset negatif menggeser awal irisan searah jarum jam.
              offset: -offsetAkumulasi,
            };
            offsetAkumulasi += panjang;
            return seg;
          })
      : [];

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={
            total > 0
              ? `Diagram lingkaran, total ${total}`
              : "Diagram lingkaran kosong"
          }
          // Putar -90° supaya irisan mulai dari atas (jam 12), bukan jam 3.
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Cincin dasar abu — juga jadi tampilan saat total 0. */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={thickness}
          />
          {irisan.map((s) => (
            <circle
              key={s.label}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={s.dash}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>

        {(centerLabel || centerSub) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerLabel && (
              <span className="text-xl font-semibold text-slate-900">
                {centerLabel}
              </span>
            )}
            {centerSub && (
              <span className="text-xs text-slate-500">{centerSub}</span>
            )}
          </div>
        )}
      </div>

      {/* Legenda: label + nilai tiap irisan. */}
      <ul className="flex flex-col gap-1.5 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: d.color }}
              aria-hidden="true"
            />
            <span className="text-slate-600">{d.label}</span>
            <span className="ml-auto font-medium text-slate-900">
              {d.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
