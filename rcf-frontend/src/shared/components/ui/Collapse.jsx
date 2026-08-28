import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";

/**
 * Panel yang membuka/menutup dengan animasi tinggi — tanpa package animasi.
 *
 * Kenapa tidak framer-motion / react-collapse: satu-satunya yang sulit di
 * animasi tinggi adalah `height: auto` tidak bisa ditransisikan. Itu sudah
 * selesai dengan CSS grid modern (`grid-template-rows: 0fr -> 1fr`), yang
 * didukung semua browser evergreen dan tidak menambah ~50KB JS hanya untuk
 * satu panel.
 *
 * Aksesibilitas & perilaku:
 * - Konten TETAP dirender saat tertutup? Tidak. `unmountSaatTutup` (default
 *   true) melepas konten setelah animasi tutup selesai, supaya form di
 *   dalamnya benar-benar fresh saat dibuka lagi dan input tersembunyi tidak
 *   ikut tab-order / autofill.
 * - `hidden` tidak dipakai (mematikan animasi); dipakai `inert` + aria-hidden
 *   selama transisi tutup supaya tidak bisa difokus di tengah animasi.
 * - Hormati `prefers-reduced-motion`: transisi dinonaktifkan lewat kelas
 *   motion-reduce Tailwind.
 */
export function Collapse({
  open,
  children,
  unmountSaatTutup = true,
  className,
  id,
}) {
  // Konten dirender kalau open, atau masih dalam proses animasi menutup.
  const [render, setRender] = useState(open);
  const timer = useRef(null);

  useEffect(() => {
    if (open) {
      if (timer.current) clearTimeout(timer.current);
      setRender(true);
      return undefined;
    }

    if (!unmountSaatTutup) return undefined;

    // Tunggu animasi tutup (300ms) selesai baru buang konten.
    timer.current = setTimeout(() => setRender(false), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open, unmountSaatTutup]);

  return (
    <div
      id={id}
      // grid 0fr -> 1fr: ini yang membuat "height: auto" bisa dianimasi.
      className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        className
      )}
      aria-hidden={!open}
      // inert: saat tertutup/menutup, isinya tidak bisa difokus lewat Tab.
      inert={!open ? "" : undefined}
    >
      {/* overflow-hidden wajib di anak: itu yang memotong konten saat 0fr */}
      <div className="overflow-hidden">{render ? children : null}</div>
    </div>
  );
}
