import { WorkQueuePage } from "../components/WorkQueuePage";
import { JENIS, STATUS } from "../constants/order.constants";

/**
 * Layar Sublim (peran PRODUKSI, jenis SUBLIM).
 *
 * Menampilkan antrian ANTRI_SUBLIM. Aksi "Selesai Sublim" memajukan order ke
 * PACKING. Terpisah dari layar Cetak dan Polyflex karena tiga proses ini
 * memakai mesin berbeda dan bisa berjalan bersamaan — operator perlu daftar
 * yang tidak tercampur.
 */
export function SublimPage() {
  return (
    <WorkQueuePage
      judul="Antrian Sublim"
      deskripsi="Order Sublim yang siap diproses."
      status={STATUS.ANTRI_SUBLIM}
      jenis={JENIS.SUBLIM}
      aksiLabel="Selesai Sublim"
      emptyText="Tidak ada order di antrian sublim."
    />
  );
}
