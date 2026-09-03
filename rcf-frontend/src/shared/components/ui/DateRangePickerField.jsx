import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Calendar } from "./Calendar";
import { cn } from "@/shared/lib/cn";

/**
 * Field rentang tanggal (dari–sampai) dengan popover kalender.
 *
 * Menggantikan pasangan <input type="date"> di RekapPage: satu tombol
 * menampilkan rentang terpilih, klik membuka kalender react-day-picker
 * mode "range" (klik pertama = mulai, klik kedua = selesai).
 *
 * Value tetap string "YYYY-MM-DD" (format yang dipakai API rekap), jadi
 * pemanggil tidak perlu tahu Date di dalamnya.
 *
 * Aksesibilitas: tombol punya aria-expanded/aria-haspopup; popover
 * ditutup dengan Esc / klik di luar; focus kembali ke tombol saat
 * ditutup lewat Esc.
 */

/** "YYYY-MM-DD" dari Date, kalender lokal (tanpa UTC shift). */
const toDateStr = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/** Date dari "YYYY-MM-DD" lokal (new Date("YYYY-MM-DD") dianggap UTC). */
const fromDateStr = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** "26 Agu 2026" — ringkas untuk label tombol. */
const tanggalPendek = (s) =>
  fromDateStr(s).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function DateRangePickerField({
  dari,
  sampai,
  onChange,
  label = "Rentang tanggal",
  // Sisi mana popover disejajarkan. Field yang duduk di tepi kanan baris
  // filter perlu "right", kalau tidak kalendernya (jauh lebih lebar dari
  // tombolnya) menjorok keluar layar.
  align = "left",
  className,
}) {
  const [buka, setBuka] = useState(false);
  const kotakRef = useRef(null);
  const tombolRef = useRef(null);

  // Posisi selected utk react-day-picker: butuh Date | undefined.
  const selected =
    dari || sampai
      ? { from: dari ? fromDateStr(dari) : undefined, to: sampai ? fromDateStr(sampai) : undefined }
      : undefined;

  const pilih = (range) => {
    // range undefined = user mengosongkan pilihan (klik tanggal sama dua kali)
    onChange({
      dari: range?.from ? toDateStr(range.from) : "",
      sampai: range?.to ? toDateStr(range.to) : "",
    });
  };

  // Klik di luar popover -> tutup.
  useEffect(() => {
    if (!buka) return;
    const klikLuar = (e) => {
      if (kotakRef.current && !kotakRef.current.contains(e.target)) {
        setBuka(false);
      }
    };
    document.addEventListener("mousedown", klikLuar);
    return () => document.removeEventListener("mousedown", klikLuar);
  }, [buka]);

  // Esc -> tutup dan fokus kembali ke tombol pembuka.
  useEffect(() => {
    if (!buka) return;
    const tombolEsc = (e) => {
      if (e.key === "Escape") {
        setBuka(false);
        tombolRef.current?.focus();
      }
    };
    document.addEventListener("keydown", tombolEsc);
    return () => document.removeEventListener("keydown", tombolEsc);
  }, [buka]);

  const labelTombol =
    dari && sampai
      ? `${tanggalPendek(dari)} – ${tanggalPendek(sampai)}`
      : dari
        ? `${tanggalPendek(dari)} – …`
        : "Pilih tanggal";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span id={`${label}-label`} className="text-sm font-medium text-slate-700">
        {label}
      </span>

      <div ref={kotakRef} className="relative">
        <button
          ref={tombolRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={buka}
          aria-labelledby={`${label}-label`}
          onClick={() => setBuka((v) => !v)}
          className={cn(
            // Lebar diserahkan ke container (w-full) — tanpa min-width sendiri,
            // supaya field ini bisa dipakai baik sebagai kolom lebar (Rekap)
            // maupun kontrol ringkas di baris filter (Pesanan). min-w-0 wajib
            // agar bisa menyusut di dalam flex tanpa mendorong tetangganya.
            "flex h-[38px] w-full min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm shadow-sm",
            "border-slate-300 bg-white text-slate-800 hover:border-slate-400",
            "focus:outline focus:outline-2 focus:outline-brand-500"
          )}
        >
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4 text-slate-400" aria-hidden="true" />
            {labelTombol}
          </span>
          <ChevronDown
            className={cn("size-4 text-slate-400 transition-transform", buka && "rotate-180")}
            aria-hidden="true"
          />
        </button>

        {buka && (
          <div
            role="dialog"
            aria-label={label}
            className={cn(
              "absolute z-20 mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            {/* Kalender dibuka pada bulan rentang yang sedang aktif, bukan
                bulan hari ini: kalau admin sedang melihat rentang Juni lalu
                membuka kalender, yang muncul harus Juni — kalau tidak, dia
                harus menavigasi mundur setiap kali hanya untuk melihat
                pilihannya sendiri. Fallback ke hari ini saat rentang kosong. */}
            <Calendar
              mode="range"
              selected={selected}
              onSelect={pilih}
              numberOfMonths={1}
              defaultMonth={selected?.from ?? selected?.to ?? undefined}
            />

            <div className="flex items-center justify-between border-t border-slate-100 px-2 pb-1 pt-2">
              <button
                type="button"
                onClick={() => pilih(undefined)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
              >
                Reset
              </button>
              <span className="text-xs text-slate-400">
                Klik dua tanggal untuk rentang
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
