import { cn } from "@/shared/lib/cn";

export function Spinner({ className, label = "Memuat..." }) {
  return (
    <div role="status" className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          "size-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600",
          className
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
