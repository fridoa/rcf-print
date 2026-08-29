import { useState } from "react";
import { Modal, Button } from "@/shared/components/ui";
import { formatWhatsapp, whatsappLink } from "@/shared/lib/phone";
import { formatRupiah, formatTanggal } from "@/shared/lib/format";
import { JENIS_LABEL, STATUS } from "../constants/order.constants";
import { useOrder, useOrderRiwayat } from "../hooks/useOrders";
import { StatusBadge } from "./StatusBadge";
import { OrderTimeline } from "./OrderTimeline";
import { OrderReadyWhatsappDialog } from "./OrderReadyWhatsappDialog";

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
  const [waOpen, setWaOpen] = useState(false);

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

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {order?.status === STATUS.READY && customer?.whatsapp ? (
              <Button
                variant="secondary"
                size="sm"
                className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300"
                onClick={() => setWaOpen(true)}
              >
                <svg
                  className="size-3.5 fill-emerald-600"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                Kabari via WhatsApp
              </Button>
            ) : (
              <div />
            )}

            <Button variant="secondary" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      )}

      <OrderReadyWhatsappDialog
        open={waOpen}
        order={order}
        onClose={() => setWaOpen(false)}
      />
    </Modal>
  );
}

