import { WorkQueuePage } from "../components/WorkQueuePage";
import { JENIS, STATUS } from "../constants/order.constants";

/**
 * Layar Polyflex (peran PRODUKSI, jenis POLYFLEX).
 *
 * Menampilkan antrian ANTRI_CUTTING. Aksi "Selesai Cutting" memajukan order
 * ke PACKING. Terpisah dari layar Cetak karena mockup memisahkan keduanya
 * dan statusnya beda (CUTTING vs CETAK).
 */
export function PolyflexPage() {
  return (
    <WorkQueuePage
      judul="Antrian Cutting (Polyflex)"
      deskripsi="Order Polyflex yang siap dipotong."
      status={STATUS.ANTRI_CUTTING}
      jenis={JENIS.POLYFLEX}
      aksiLabel="Selesai Cutting"
      emptyText="Tidak ada order di antrian cutting."
    />
  );
}
