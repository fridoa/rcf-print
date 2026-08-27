import { cn } from "@/shared/lib/cn";

const TONES = {
  error: "bg-danger-50 text-danger-600 ring-danger-500/30",
  success: "bg-success-50 text-success-500 ring-success-500/30",
  info: "bg-brand-50 text-brand-700 ring-brand-500/30",
  warning: "bg-amber-50 text-amber-700 ring-amber-500/30",
};

/**
 * Pesan status untuk hasil submit form / error request.
 *
 * role="alert" dipakai supaya pesan langsung dibacakan pembaca layar
 * begitu muncul — penting karena pesan ini biasanya hasil aksi user.
 */
export function Alert({ tone = "info", title, messages = [], className }) {
  const list = Array.isArray(messages) ? messages : [messages];

  if (!title && list.length === 0) return null;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg px-3 py-2 text-sm ring-1 ring-inset",
        TONES[tone],
        className
      )}
    >
      {title && <p className="font-medium">{title}</p>}

      {list.length > 0 && (
        <ul className={cn("space-y-0.5", title && "mt-1")}>
          {list.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
