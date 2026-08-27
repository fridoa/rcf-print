import { WorkQueuePage } from "../components/WorkQueuePage";
import { JENIS, STATUS } from "../constants/order.constants";

/**
 * Layar Cetak (peran PRODUKSI, jenis DTF).
 *
 * Menampilkan antrian ANTRI_CETAK. Aksi "Selesai Cetak" memajukan order ke
 * PACKING — satu klik tanpa input, jadi cukup WorkQueuePage generik.
 */
export function CetakPage() {
  return (
    <WorkQueuePage
      judul="Antrian Cetak (DTF)"
      deskripsi="Order DTF yang siap dicetak."
      status={STATUS.ANTRI_CETAK}
      jenis={JENIS.DTF}
      aksiLabel="Selesai Cetak"
      emptyText="Tidak ada order di antrian cetak."
    />
  );
}
