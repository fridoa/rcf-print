import { STATUS_LABEL, STATUS_TONE } from "../constants/order.constants";
import { cn } from "@/shared/lib/cn";

/**
 * Badge status order. Warna dipetakan dari STATUS_TONE, label dari
 * STATUS_LABEL — keduanya di order.constants supaya seragam di semua layar.
 */
export function StatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_TONE[status] ?? "bg-slate-100 text-slate-700",
        className
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
