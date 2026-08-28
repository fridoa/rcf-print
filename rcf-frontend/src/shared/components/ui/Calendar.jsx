import { DayPicker } from "react-day-picker";
import { id } from "react-day-picker/locale";
import { cn } from "@/shared/lib/cn";

/**
 * Kalender berbasis react-day-picker v10, distyling penuh dengan kelas
 * Tailwind project ini (tanpa style.css bawaan) supaya menyatu dengan
 * design system: rounded-lg, border-slate, brand-500 untuk pilihan.
 *
 * Dua pemakaian:
 *   <Calendar />                  -> pilih satu tanggal (mode single)
 *   <Calendar mode="range" ... /> -> pilih rentang dari–sampai (Rekap)
 *
 * Lokale Indonesia: nama hari/bulan + minggu mulai Senin (firstWeekaday
 * mengikuti locale id).
 *
 * Navigasi bulan+tahun via dropdown (captionLayout="dropdown") supaya
 * lompat beberapa tahun tidak perlu klik panah 12x per tahun. Batas
 * tahun bisa dioverride lewat props startYear/endYear (default: 10 tahun
 * ke belakang s/d 1 tahun ke depan — cukup untuk rekap bisnis).
 */

// Kelas dasar tombol hari: dijadikan satu string supaya react-day-picker
// bisa memakainya untuk semua varian hari (biasa, terpilih, range, dll).
const hariKelas =
  "inline-flex size-9 items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-40";

const navBtnKelas = cn(
  "inline-flex size-8 items-center justify-center rounded-lg text-slate-500",
  "hover:bg-slate-100 hover:text-slate-700 focus-visible:outline",
  "focus-visible:outline-2 focus-visible:outline-brand-500 transition-colors",
  "disabled:opacity-30 disabled:pointer-events-none"
);

const kelasKalender = {
  root: "w-full",
  months: "flex flex-col sm:flex-row gap-4",
  month: "flex flex-col gap-3",
  month_caption: "flex justify-center items-center h-9 relative px-8",
  caption_label:
    "inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 pointer-events-none select-none",
  dropdowns: "flex items-center justify-center gap-1.5",
  dropdown_root: cn(
    "relative inline-flex items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-sm font-medium text-slate-700 shadow-sm",
    "hover:border-slate-400 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-brand-500 transition-all"
  ),
  dropdown:
    "absolute inset-0 size-full cursor-pointer opacity-0 z-10 appearance-none",
  nav: "absolute inset-x-0 flex items-center justify-between px-1 pointer-events-none",
  button_previous: cn(navBtnKelas, "absolute left-1 pointer-events-auto"),
  button_next: cn(navBtnKelas, "absolute right-1 pointer-events-auto"),
  chevron: "fill-slate-500 size-3.5 shrink-0 inline-block ml-1",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday:
    "flex-1 select-none text-xs font-medium uppercase tracking-wide text-slate-400 text-center py-1",
  week: "flex w-full mt-1",
  day: "flex-1 flex justify-center",
  day_button: hariKelas,
  range_start: "rounded-r-none bg-brand-50 rounded-l-lg",
  range_end: "rounded-l-none bg-brand-50 rounded-r-lg",
  range_middle: cn(
    "rounded-none bg-brand-50 text-brand-700 not-[:disabled]:hover:bg-brand-100"
  ),
  selected: "!bg-brand-600 !text-white not-[:disabled]:hover:bg-brand-700",
  today: "font-bold text-brand-700",
  disabled: "text-slate-300 opacity-40 line-through",
  hidden: "invisible",
  outside: "text-slate-300",
};

export function Calendar({
  mode = "single",
  selected,
  onSelect,
  disabled,
  numberOfMonths = 1,
  startYear,
  endYear,
  className,
  ...props
}) {
  const kini = new Date();
  const awal = new Date((startYear ?? kini.getFullYear() - 10), 0, 1);
  const akhir = new Date((endYear ?? kini.getFullYear() + 1), 11, 31);

  return (
    <DayPicker
      mode={mode}
      selected={selected}
      onSelect={onSelect}
      disabled={disabled}
      numberOfMonths={numberOfMonths}
      locale={id}
      hideWeekdays={false}
      showOutsideDays
      captionLayout="dropdown"
      startMonth={awal}
      endMonth={akhir}
      classNames={kelasKalender}
      className={cn("select-none p-2", className)}
      {...props}
    />
  );
}
