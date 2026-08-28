import { Spinner } from "@/shared/components/ui";
import { formatTanggalJam } from "@/shared/lib/format";
import { STATUS_LABEL } from "../constants/order.constants";

/**
 * Timeline riwayat status satu order — menjawab "siapa yang memajukan order
 * ke step berikutnya, kapan, dan kenapa".
 *
 * Sumber data: GET /orders/:id/riwayat (StatusLog), yang tiap entrinya memuat
 *   - status_dari / status_ke : perpindahan status (status_dari null = order dibuat)
 *   - user_id { name, role }  : pelaku, sudah di-populate backend
 *   - catatan                 : alasan/koreksi (opsional)
 *   - createdAt               : waktu kejadian
 *
 * Presentational murni: menerima logs + state loading dari pemanggil.
 */
export function OrderTimeline({ logs = [], isLoading = false, error }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner label="Memuat riwayat..." />
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="py-4 text-sm text-danger-600">
        {error.message ?? "Gagal memuat riwayat order."}
      </p>
    );
  }

  if (logs.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-slate-500">
        Belum ada riwayat perubahan status.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-0">
      {logs.map((log, i) => {
        const pelaku = log.user_id;
        const namaPelaku =
          pelaku && typeof pelaku === "object" ? pelaku.name : "—";
        const rolePelaku =
          pelaku && typeof pelaku === "object" ? pelaku.role : null;
        const pembuatan = !log.status_dari; // status_dari null = event pembuatan

        return (
          <li key={log._id ?? i} className="flex gap-3">
            {/* Rel + titik timeline. Garis disembunyikan di item terakhir. */}
            <div className="flex flex-col items-center">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" />
              {i < logs.length - 1 && (
                <span className="w-px grow bg-slate-200" aria-hidden="true" />
              )}
            </div>

            <div className="pb-5">
              <p className="text-sm text-slate-800">
                {pembuatan ? (
                  <>
                    Order dibuat →{" "}
                    <strong className="font-semibold">
                      {STATUS_LABEL[log.status_ke] ?? log.status_ke}
                    </strong>
                  </>
                ) : (
                  <>
                    <span className="text-slate-500">
                      {STATUS_LABEL[log.status_dari] ?? log.status_dari}
                    </span>{" "}
                    →{" "}
                    <strong className="font-semibold">
                      {STATUS_LABEL[log.status_ke] ?? log.status_ke}
                    </strong>
                  </>
                )}
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                oleh <span className="text-slate-700">{namaPelaku}</span>
                {rolePelaku && (
                  <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-600">
                    {rolePelaku}
                  </span>
                )}
                <span className="mx-1.5 text-slate-300">•</span>
                {formatTanggalJam(log.createdAt)}
              </p>

              {log.catatan && (
                <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">
                  “{log.catatan}”
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
