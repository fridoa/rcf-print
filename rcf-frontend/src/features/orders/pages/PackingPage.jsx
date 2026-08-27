import { WorkQueuePage } from "../components/WorkQueuePage";
import { STATUS } from "../constants/order.constants";

/**
 * Layar Packing (peran PACKING).
 *
 * Menampilkan antrian PACKING untuk kedua jenis. Aksi "Tandai Siap"
 * memajukan order ke READY (siap diambil pelanggan). Setelah READY, admin
 * yang menyelesaikan + mencatat pembayaran di halaman Pesanan.
 */
export function PackingPage() {
  return (
    <WorkQueuePage
      judul="Antrian Packing"
      deskripsi="Order yang selesai produksi dan menunggu dikemas."
      status={STATUS.PACKING}
      aksiLabel="Tandai Siap"
      emptyText="Tidak ada order di antrian packing."
      columns={["kode", "jenis", "pelanggan", "qty", "deadline", "status"]}
    />
  );
}
