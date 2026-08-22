import { forwardRef, useId } from "react";
import { cn } from "@/shared/lib/cn";

/**
 * Input berlabel dengan dukungan pesan error.
 *
 * Aksesibilitas: label selalu terhubung ke input lewat htmlFor/id,
 * error dihubungkan lewat aria-describedby dan ditandai aria-invalid,
 * sehingga pembaca layar membacakan errornya saat fokus masuk.
 */
export const TextField = forwardRef(function TextField(
  { label, error, type = "text", hint, className, id, ...props },
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

      <input
        ref={ref}
        id={inputId}
        type={type}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm",
          "placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-offset-0",
          error
            ? "border-danger-500 focus:outline-danger-500"
            : "border-slate-300 focus:outline-brand-500"
        )}
        {...props}
      />

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
