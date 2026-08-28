import { forwardRef } from "react";
import { cn } from "@/shared/lib/cn";

const VARIANTS = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600",
  secondary:
    "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400",
  danger:
    "bg-danger-500 text-white hover:bg-danger-600 focus-visible:outline-danger-500",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400",
  // Ungu: dipakai untuk aksi keamanan (ubah password) supaya berbeda jelas
  // dari aksi utama (brand) tanpa terlihat berbahaya seperti `danger`.
  purple:
    "bg-violet-600 text-white hover:bg-violet-700 focus-visible:outline-violet-600",
};

const SIZES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

/**
 * Tombol dasar.
 *
 * Saat isLoading: tombol di-disable dan diberi aria-busy, supaya
 * pembaca layar tahu prosesnya masih jalan — bukan hanya spinner visual.
 */
export const Button = forwardRef(function Button(
  {
    type = "button",
    variant = "primary",
    size = "md",
    isLoading = false,
    disabled = false,
    className,
    children,
    ...props
  },
  ref
) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {isLoading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
});
