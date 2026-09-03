import { TableSkeleton } from "@/shared/components/ui";
import { useIsDesktop } from "@/shared/hooks/useMediaQuery";
import { formatWhatsapp, whatsappLink } from "@/shared/lib/phone";
import { formatRupiah, formatTanggal } from "@/shared/lib/format";
import { kelompokkanPerTanggal } from "@/shared/lib/date-range";
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
 * - groupByTanggal: sisipkan baris pemisah per tgl_order ("Hari Ini",
 *   "Kemarin", "Sen, 25 Agu 2026"). Opt-in supaya layar produksi yang
 *   mengurutkan antrean per status tidak berubah perilakunya.
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
  groupByTanggal = false,
  renderAction,
}) {
  // Hook harus dipanggil sebelum early return apa pun (rules-of-hooks):
  // skeleton loading di bawah adalah early return, jadi useIsDesktop tidak
  // boleh menunggu setelahnya — urutan hook wajib sama tiap render.
  const isDesktop = useIsDesktop();

  if (isLoading) {
    return (
      <TableSkeleton
        rows={5}
        columns={columns.length}
        action={typeof renderAction === "function"}
      />
    );
  }

  const adaAksi = typeof renderAction === "function";
  const kosong = orders.length === 0;
  const jumlahKolom = columns.length + (adaAksi ? 1 : 0);

  // Satu bentuk data untuk kedua tampilan: tanpa grouping = satu grup tanpa
  // label, jadi kode render di bawah tidak perlu bercabang dua kali.
  const grup = groupByTanggal
    ? kelompokkanPerTanggal(orders)
    : [{ kunci: "semua", label: null, orders }];

  // Pilih SATU tampilan (bukan render dua-duanya lalu sembunyikan dengan CSS):
  // menjaga DOM tetap tunggal — lebih hemat, aksesibilitas bersih, dan tidak
  // ada teks/kode order ganda.
  if (isDesktop) {
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
            {/* Kosong: header kolom tetap tampil, isi diganti satu baris pesan. */}
            {kosong ? (
              <tr>
                <td
                  colSpan={jumlahKolom}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              grup.flatMap((g) => [
                // Baris pemisah tanggal: satu baris penuh selebar tabel dengan
                // teks "Order Hari Ini" / "Order Kemarin" / "Order Sen, 25 Agu
                // 2026". scope="colgroup" dipakai (bukan role="presentation")
                // karena ini memang konteks yang perlu terbaca screen reader
                // sebelum baris-baris di bawahnya.
                ...(g.label
                  ? [
                      <tr key={`grup-${g.kunci}`} className="bg-slate-100">
                        <th
                          scope="colgroup"
                          colSpan={jumlahKolom}
                          className="px-4 py-2.5 text-left text-sm font-semibold text-slate-700"
                        >
                          Order {g.label}
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            {g.orders.length} order
                          </span>
                        </th>
                      </tr>,
                    ]
                  : []),
                ...g.orders.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50">
                    {columns.map((key) => (
                      <td
                        key={key}
                        className={`px-4 py-3 ${
                          SEMUA_KOLOM[key]?.align === "right"
                            ? "text-right"
                            : ""
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
                )),
              ])
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // Layar kecil (< md): daftar kartu. Tiap kartu = satu order.
  if (kosong) {
    return (
      <p className="rounded-lg bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-4" aria-busy={isFetching || undefined}>
      {grup.map((g) => (
        <section key={g.kunci} className="space-y-3">
          {g.label && (
            <h3 className="flex items-baseline gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
              Order {g.label}
              <span className="text-xs font-normal text-slate-500">
                {g.orders.length} order
              </span>
            </h3>
          )}

          <ul className="space-y-3">
            {g.orders.map((order) => (
              <li
                key={order._id}
                className="rounded-lg bg-white p-4 ring-1 ring-slate-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <OrderCell order={order} kolom="kode" />
                    <p className="mt-0.5 text-xs text-slate-500">
                      {JENIS_LABEL[order.jenis] ?? order.jenis}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {columns.includes("pelanggan") && (
                  <div className="mt-3 text-sm">
                    <OrderCell order={order} kolom="pelanggan" />
                  </div>
                )}

                {/* Ringkasan field angka/tanggal sebagai pasangan label-nilai. */}
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {columns
                    .filter((key) =>
                      [
                        "qty",
                        "file",
                        "harga",
                        "metode",
                        "deadline",
                        "tanggal",
                      ].includes(key)
                    )
                    .map((key) => (
                      <div key={key} className="flex flex-col">
                        <dt className="text-xs uppercase text-slate-400">
                          {SEMUA_KOLOM[key]?.header ?? key}
                        </dt>
                        <dd className="text-slate-700">
                          <OrderCell order={order} kolom={key} />
                        </dd>
                      </div>
                    ))}
                </dl>

                {adaAksi && (
                  <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                    {renderAction(order)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
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
