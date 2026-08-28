import { Alert, CardsSkeleton } from "@/shared/components/ui";

/**
 * Kerangka umum semua dashboard role: judul + sapaan, lalu menangani state
 * loading/error secara seragam supaya tiap dashboard role fokus ke isinya.
 *
 * children hanya dirender saat data siap (tidak loading & tidak error).
 */
export function DashboardShell({
  nama,
  peranLabel,
  isLoading,
  isError,
  error,
  children,
}) {
  return (
    <section className="flex flex-col gap-5">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Ringkasan {peranLabel ? `${peranLabel} ` : ""}hari ini.
        </p>
      </header>

      {isError && (
        <Alert
          tone="error"
          title={error?.message ?? "Gagal memuat statistik."}
          messages={error?.errors ?? []}
        />
      )}

      {isLoading ? (
        <CardsSkeleton tiles={4} panels={2} />
      ) : (
        !isError && children
      )}
    </section>
  );
}

/**
 * Panel bertajuk — kartu putih dengan judul, dipakai membungkus chart/daftar.
 */
export function Panel({ title, action, children, className }) {
  return (
    <div
      className={`rounded-xl bg-white p-4 ring-1 ring-slate-200 ${
        className ?? ""
      }`}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && (
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
