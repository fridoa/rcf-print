import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";

/**
 * Komponen Dropdown Menu floating dengan positioning fixed dan z-index tinggi.
 *
 * Menggunakan positioning fixed berbasis getBoundingClientRect() agar TIDAK
 * terpotong (clipped) oleh container tabel atau kartu yang memiliki
 * overflow-x-auto / overflow-hidden.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.trigger]  Kustom trigger button (default: tombol titik tiga)
 * @param {string} [props.align="right"]     Arah alignment menu ("left" | "right")
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children   Daftar DropdownMenuItem / DropdownMenuDivider
 */
export function DropdownMenu({
  trigger,
  align = "right",
  className,
  children,
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, right: 0, isUp: false });

  const hitungPosisi = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const ruangBawah = window.innerHeight - rect.bottom;
    // Jika berada di dekat dasar layar (< 220px) dan ada cukup ruang di atas, buka ke atas
    const isUp = ruangBawah < 220 && rect.top > 220;

    setCoords({
      top: isUp ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      right: window.innerWidth - rect.right,
      isUp,
    });
  };

  const toggleOpen = () => {
    hitungPosisi();
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;

    hitungPosisi();

    const handleOutsideClick = (e) => {
      const isInsideTrigger =
        triggerRef.current && triggerRef.current.contains(e.target);
      const isInsideMenu =
        menuRef.current && menuRef.current.contains(e.target);

      if (!isInsideTrigger && !isInsideMenu) {
        setOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    const handleScrollOrResize = () => {
      hitungPosisi();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  return (
    <div className="relative inline-block text-left">
      <div ref={triggerRef} className="inline-block">
        {trigger ? (
          <div onClick={toggleOpen}>{trigger}</div>
        ) : (
          <button
            type="button"
            aria-label="Menu Aksi"
            aria-haspopup="true"
            aria-expanded={open}
            onClick={toggleOpen}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition shadow-sm",
              "hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
              open && "bg-slate-100 text-slate-900 ring-2 ring-slate-200"
            )}
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "fixed",
            top: coords.isUp ? undefined : `${coords.top}px`,
            bottom: coords.isUp
              ? `${window.innerHeight - coords.top}px`
              : undefined,
            ...(align === "right"
              ? { right: `${Math.max(8, coords.right)}px` }
              : { left: `${Math.max(8, coords.left)}px` }),
            zIndex: 9999,
          }}
          className={cn(
            "min-w-[170px] rounded-xl border border-slate-100 bg-white p-1 shadow-2xl ring-1 ring-black/10 focus:outline-none",
            className
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Satu item di dalam DropdownMenu.
 */
export function DropdownMenuItem({
  onClick,
  tone = "default",
  icon,
  children,
  className,
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition",
        tone === "default" &&
          "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
        tone === "danger" &&
          "text-danger-600 hover:bg-danger-50 hover:text-danger-700",
        tone === "success" &&
          "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800",
        className
      )}
    >
      {icon && <span className="size-4 shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

/**
 * Garis pemisah horizontal antar kelompok item.
 */
export function DropdownMenuDivider() {
  return <div className="my-1 border-t border-slate-100" />;
}
