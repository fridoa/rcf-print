import { useEffect, useRef } from "react";
import { cn } from "@/shared/lib/cn";

/**
 * Dialog sederhana berbasis <dialog> native.
 *
 * Dipilih daripada div + overlay manual karena <dialog showModal()> sudah
 * memberi focus trap, penutupan lewat Esc, dan inert pada konten di
 * belakangnya — tiga hal aksesibilitas yang biasanya lupa diimplementasi
 * kalau dibuat sendiri.
 *
 * Catatan: konten hanya dirender saat open, supaya form di dalamnya
 * benar-benar fresh setiap dialog dibuka (tidak menyisakan isian lama).
 */
export function Modal({ open, onClose, title, description, children, size = "md" }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Lebar dialog per kebutuhan: form standar tetap "md" (default, tidak
  // mengubah pemakaian lama); "lg" untuk konten padat seperti detail + timeline.
  const lebar = size === "lg" ? "max-w-lg" : "max-w-md";

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        // cegah penutupan default supaya state `open` tetap jadi sumber kebenaran
        e.preventDefault();
        onClose?.();
      }}
      className={cn(
        "w-full rounded-2xl p-0 backdrop:bg-slate-900/40",
        lebar,
        "m-auto bg-white shadow-lg"
      )}
    >
      {open && (
        <div className="p-5">
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </header>

          {children}
        </div>
      )}
    </dialog>
  );
}
