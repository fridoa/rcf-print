import { Button, Spinner } from "@/shared/components/ui";
import { formatWhatsapp, whatsappLink } from "@/shared/lib/phone";

/**
 * Tabel pelanggan.
 *
 * Presentational: tidak tahu soal react-query maupun modal. Aksi
 * dilempar ke atas lewat onEdit/onDelete supaya komponen ini bisa
 * dipakai ulang (mis. nanti untuk pemilihan pelanggan di form order).
 *
 * canManage dipakai menyembunyikan tombol Ubah/Hapus untuk role non-admin.
 * Ini hanya UX — backend tetap menolaknya dengan 403.
 */
export function CustomerTable({
  customers = [],
  isLoading = false,
  isFetching = false,
  canManage = false,
  onEdit,
  onDelete,
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner label="Memuat data pelanggan..." />
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Belum ada pelanggan yang cocok.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-slate-200">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Daftar pelanggan RCF Print</caption>

        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Nama
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              WhatsApp
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Catatan
            </th>
            {canManage && (
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Aksi
              </th>
            )}
          </tr>
        </thead>

        <tbody
          className="divide-y divide-slate-100"
          aria-busy={isFetching || undefined}
        >
          {customers.map((customer) => (
            <tr key={customer._id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800">
                {customer.name}
              </td>

              <td className="px-4 py-3">
                <a
                  href={whatsappLink(customer.whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  {formatWhatsapp(customer.whatsapp)}
                </a>
              </td>

              <td className="px-4 py-3 text-slate-600">
                {customer.note || "-"}
              </td>

              {canManage && (
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEdit?.(customer)}
                      aria-label={`Ubah ${customer.name}`}
                    >
                      Ubah
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDelete?.(customer)}
                      aria-label={`Hapus ${customer.name}`}
                    >
                      Hapus
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
