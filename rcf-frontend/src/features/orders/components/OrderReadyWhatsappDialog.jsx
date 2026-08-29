import { Modal, Button } from "@/shared/components/ui";
import {
  formatWhatsapp,
  whatsappLink,
  createReadyWhatsappMessage,
} from "@/shared/lib/phone";
import { JENIS_LABEL } from "../constants/order.constants";

/**
 * Dialog konfirmasi dan notifikasi WhatsApp ketika order ditandai READY (Siap Diambil).
 *
 * Memberi opsi instan bagi petugas packing / admin untuk langsung membuka chat
 * WhatsApp ke nomor pelanggan dengan template pesan siap ambil yang sudah terformat.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object} props.order       Data order yang baru ditandai READY
 * @param {() => void} props.onClose
 */
export function OrderReadyWhatsappDialog({ open, order, onClose }) {
  if (!order) return null;

  const customer = order.customer_id || order.customer;
  const customerName =
    typeof customer === "object" ? customer?.name : customer || "Pelanggan";
  const customerPhone = typeof customer === "object" ? customer?.whatsapp : "";
  const pesan = createReadyWhatsappMessage(order);
  const waUrl = whatsappLink(customerPhone, pesan);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Order Siap Diambil! 🎉"
      description="Order berhasil dipindahkan ke status Siap Diambil. Kabari pelanggan via WhatsApp sekarang?"
    >
      <div className="flex flex-col gap-4">
        {/* Ringkasan Singkat */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-emerald-950">
              {order.kode_order}
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-900">
              {JENIS_LABEL[order.jenis] ?? order.jenis}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-emerald-900">
            <div>
              <span className="text-emerald-700">Pelanggan:</span>{" "}
              <strong className="font-medium">{customerName}</strong>
            </div>
            <div>
              <span className="text-emerald-700">WhatsApp:</span>{" "}
              <strong className="font-medium">
                {customerPhone ? formatWhatsapp(customerPhone) : "-"}
              </strong>
            </div>
            {order.total_qty && (
              <div>
                <span className="text-emerald-700">Total Qty:</span>{" "}
                <strong className="font-medium">{order.total_qty} pcs</strong>
              </div>
            )}
          </div>
        </div>

        {/* Preview Pesan WhatsApp */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Pratinjau Pesan:
          </label>
          <div className="max-h-36 overflow-y-auto whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 select-all">
            {pesan}
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="mt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Nanti Saja / Tutup
          </Button>

          {customerPhone ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 shadow-sm"
            >
              <svg
                className="size-4 fill-current"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              Kirim Pesan WhatsApp
            </a>
          ) : (
            <span className="text-xs text-slate-400 self-center">
              (Nomor WhatsApp tidak tersedia)
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}
