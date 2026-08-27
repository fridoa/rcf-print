import { forwardRef, useId } from "react";
import { cn } from "@/shared/lib/cn";
import { digitOnly, formatRibuan } from "@/shared/lib/format";

/**
 * Input mata uang Rupiah.
 *
 * Menampilkan prefix "Rp" di dalam field dan memformat angka dengan pemisah
 * ribuan otomatis ("50000" tampil "50.000") supaya admin tidak salah baca
 * nominal. Namun VALUE yang dilaporkan ke react-hook-form tetap digit murni
 * ("50000") — jadi schema Yup (number) & payload API tidak berubah.
 *
 * Dipakai controlled: teruskan value (digit murni / angka) + onChange dari
 * Controller. onChange dipanggil dengan string digit murni.
 */
export const CurrencyField = forwardRef(function CurrencyField(
  { label, error, hint, className, id, value, onChange, onBlur, name, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  // Yang ditampilkan: angka diformat ribuan. Yang disimpan form: digit murni.
  const tampil = formatRibuan(value);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
        {label}
      </label>

      <div
        className={cn(
          "flex w-full items-center rounded-lg border px-3 py-2 text-sm shadow-sm",
          "focus-within:outline focus-within:outline-2 focus-within:outline-offset-0",
          error
            ? "border-danger-500 focus-within:outline-danger-500"
            : "border-slate-300 focus-within:outline-brand-500"
        )}
      >
        <span className="mr-2 select-none text-slate-500" aria-hidden="true">
          Rp
        </span>
        <input
          ref={ref}
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          value={tampil}
          onChange={(e) => onChange?.(digitOnly(e.target.value))}
          onBlur={onBlur}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
          {...props}
        />
      </div>

      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
});
