import { forwardRef, useId } from "react";
import { cn } from "@/shared/lib/cn";

/**
 * Dropdown berlabel, sekelas dengan TextField (label + error + hint,
 * aria-invalid + aria-describedby) supaya keduanya bisa dipakai bergantian
 * di dalam <Controller> tanpa kejutan aksesibilitas.
 *
 * `options` = [{ value, label }]. `placeholder` merender <option> kosong
 * di paling atas untuk keadaan "belum dipilih"; kalau tidak diberi, opsi
 * pertama yang jadi default bawaan browser.
 */
export const SelectField = forwardRef(function SelectField(
  { label, error, hint, options = [], placeholder, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
        {label}
      </label>

      <select
        ref={ref}
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        className={cn(
          "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
          "focus:outline focus:outline-2 focus:outline-offset-0",
          error
            ? "border-danger-500 focus:outline-danger-500"
            : "border-slate-300 focus:outline-brand-500"
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

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
