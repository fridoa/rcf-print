import { Modal, Button } from "@/shared/components/ui";
import { formatWhatsapp, whatsappLink } from "@/shared/lib/phone";
import { formatRupiah, formatTanggal } from "@/shared/lib/format";
import { JENIS_LABEL } from "../constants/order.constants";
import { useOrder, useOrderRiwayat } from "../hooks/useOrders";
import { StatusBadge } from "./StatusBadge";
import { OrderTimeline } from "./OrderTimeline";

/**
 * Dialog detail order + timeline tracking.
 *
 * Menjawab kebutuhan "kelihatan siapa yang approve ke step berikutnya":
 * bagian atas ringkasan order (pelanggan, jenis, qty, harga, desain), bagian
 * bawah OrderTimeline yang menampilkan tiap perpindahan status + pelakunya.
 *
 * Data diambil ulang dari server (bukan dari baris tabel) supaya field yang
 * tidak ikut di list — design_ids ter-populate, dsb — lengkap. Query hanya
 * jalan saat dialog terbuka (orderId ada), lihat useOrder/useOrderRiwayat.
 */
export function OrderDetailDialog({ open, orderId, onClose }) {
  const {
    data: order,
    isLoading: orderLoading,
    error: orderError,
  } = useOrder(open ? orderId : undefined);

  const {
    data: logs,
    isLoading: logsLoading,
    error: logsError,
  } = useOrderRiwayat(open ? orderId : undefined);

  const customer = order?.customer_id;
  const designs = Array.isArray(order?.design_ids) ? order.design_ids : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={order ? `Order ${order.kode_order}` : "Detail Order"}
      description="Ringkasan order dan riwayat siapa memproses tiap langkah."
    >
      {orderError ? (
        <p role="alert" className="py-4 text-sm text-danger-600">
          {orderError.message ?? "Gagal memuat order."}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Ringkasan */}
          {order && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={order.status} />
                <span className="text-xs text-slate-500">
                  {JENIS_LABEL[order.jenis] ?? order.jenis}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="col-span-2">
                  <dt className="text-xs text-slate-500">Pelanggan</dt>
                  <dd className="text-slate-800">
                    {customer && typeof customer === "object" ? (
                      <>
                        {customer.name}{" "}
                        <a
                          href={whatsappLink(customer.whatsapp)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand-600 hover:underline"
                        >
                          {formatWhatsapp(customer.whatsapp)}
                        </a>
                      </>
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-slate-500">Total Qty</dt>
                  <dd className="text-slate-800">{order.total_qty ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Jumlah File</dt>
                  <dd className="text-slate-800">{order.file_count ?? "-"}</dd>
                </div>

                <div>
                  <dt className="text-xs text-slate-500">Harga</dt>
                  <dd className="text-slate-800">
                    {formatRupiah(order.total_harga)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Metode Bayar</dt>
                  <dd className="text-slate-800">{order.metode_bayar ?? "-"}</dd>
                </div>

                <div>
                  <dt className="text-xs text-slate-500">Tgl Order</dt>
                  <dd className="text-slate-800">
                    {formatTanggal(order.tgl_order)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Deadline</dt>
                  <dd className="text-slate-800">
                    {formatTanggal(order.deadline)}
                  </dd>
                </div>
              </dl>

              {/* Thumbnail desain terkait */}
              {designs.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs text-slate-500">
                    Desain ({designs.length})
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {designs.map((d) => (
                      <li key={d._id}>
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                          title={d.label || d.original_name}
                        >
                          <img
                            src={d.thumbnail_url || d.url}
                            alt={d.label || d.original_name || "Desain"}
                            loading="lazy"
                            className="h-14 w-14 rounded border border-slate-200 object-cover"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Timeline tracking */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Riwayat Proses
            </h3>
            <OrderTimeline
              logs={logs ?? []}
              isLoading={orderLoading || logsLoading}
              error={logsError}
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button variant="secondary" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
