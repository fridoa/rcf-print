import { Button, Spinner } from "@/shared/components/ui";
import { formatWhatsapp, whatsappLink } from "@/shared/lib/phone";
import { formatRupiah, formatTanggal } from "@/shared/lib/format";
import { JENIS_LABEL } from "../constants/order.constants";
import { StatusBadge } from "./StatusBadge";

/**
 * Tabel order — presentational, dipakai ulang semua layar kerja.
 *
 * Tiap layar mengendalikan tampilan lewat props, bukan lewat cabang internal:
 * - columns: daftar kolom yang mau ditampilkan (lihat KOLOM di bawah).
 * - renderAction(order): fungsi yang mengembalikan tombol aksi untuk baris
 *   itu (mis. "Selesai Desain", "Selesai Cetak"). Kembalikan null untuk tak
 *   ada aksi. Ini membuat tabel tak perlu tahu soal role/status/mutation.
 *
 * emptyText bisa disetel per layar ("Tidak ada antrian desain", dst).
 */
const SEMUA_KOLOM = {
  kode: { header: "Kode", align: "left" },
  jenis: { header: "Jenis", align: "left" },
  pelanggan: { header: "Pelanggan", align: "left" },
  status: { header: "Status", align: "left" },
  qty: { header: "Qty", align: "right" },
  file: { header: "File", align: "right" },
  harga: { header: "Harga", align: "right" },
  metode: { header: "Bayar", align: "left" },
  deadline: { header: "Deadline", align: "left" },
  tanggal: { header: "Tgl Order", align: "left" },
};

export function OrderTable({
  orders = [],
  columns = ["kode", "jenis", "pelanggan", "status"],
  isLoading = false,
  isFetching = false,
  emptyText = "Belum ada order yang cocok.",
  renderAction,
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner label="Memuat data order..." />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">{emptyText}</p>
    );
  }

  const adaAksi = typeof renderAction === "function";

  return (
    <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-slate-200">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Daftar order RCF Print</caption>

        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {columns.map((key) => (
              <th
                key={key}
                scope="col"
                className={`px-4 py-3 font-medium ${
                  SEMUA_KOLOM[key]?.align === "right" ? "text-right" : ""
                }`}
              >
                {SEMUA_KOLOM[key]?.header ?? key}
              </th>
            ))}
            {adaAksi && (
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
          {orders.map((order) => (
            <tr key={order._id} className="hover:bg-slate-50">
              {columns.map((key) => (
                <td
                  key={key}
                  className={`px-4 py-3 ${
                    SEMUA_KOLOM[key]?.align === "right" ? "text-right" : ""
                  }`}
                >
                  <OrderCell order={order} kolom={key} />
                </td>
              ))}

              {adaAksi && (
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {renderAction(order)}
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

/** Isi satu sel berdasarkan nama kolom. Dipisah agar OrderTable tetap rapi. */
function OrderCell({ order, kolom }) {
  switch (kolom) {
    case "kode":
      return (
        <span className="font-medium text-slate-800">{order.kode_order}</span>
      );
    case "jenis":
      return JENIS_LABEL[order.jenis] ?? order.jenis;
    case "pelanggan": {
      const c = order.customer_id;
      // customer_id ter-populate jadi objek { name, whatsapp } dari backend.
      if (!c || typeof c !== "object") {
        return <span className="text-slate-400">-</span>;
      }
      return (
        <div className="flex flex-col">
          <span className="text-slate-800">{c.name}</span>
          <a
            href={whatsappLink(c.whatsapp)}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-brand-600 hover:underline"
          >
            {formatWhatsapp(c.whatsapp)}
          </a>
        </div>
      );
    }
    case "status":
      return <StatusBadge status={order.status} />;
    case "qty":
      return order.total_qty ?? "-";
    case "file":
      return order.file_count ?? "-";
    case "harga":
      return formatRupiah(order.total_harga);
    case "metode":
      return order.metode_bayar ?? "-";
    case "deadline":
      return formatTanggal(order.deadline);
    case "tanggal":
      return formatTanggal(order.tgl_order);
    default:
      return null;
  }
}
