import { useState } from "react";
import { Alert, Button, Modal, TextField } from "@/shared/components/ui";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { OrderTable } from "../components/OrderTable";
import { SelesaiDesainForm } from "../components/SelesaiDesainForm";
import { STATUS } from "../constants/order.constants";
import { useOrders } from "../hooks/useOrders";
import { useMajukanStatus } from "../hooks/useOrderMutations";

/**
 * Layar Desain (peran DESIGNER).
 *
 * Menampilkan antrian ANTRI_DESAIN untuk KEDUA jenis (DTF & Polyflex sama-sama
 * lewat tahap desain, sesuai ERD). Memajukan order dari sini menandai desain
 * selesai — file & qty sudah tercatat saat order dibuat, jadi form hanya
 * mengumpulkan catatan opsional untuk operator produksi.
 */
export function DesainPage() {
  // Pencarian kode order / pelanggan (debounced supaya tak menembak API tiap huruf).
  const [inputCari, setInputCari] = useState("");
  const search = useDebouncedValue(inputCari);

  const { data, isLoading, isFetching, error } = useOrders({
    status: STATUS.ANTRI_DESAIN,
    search,
    limit: 50,
    sort: "createdAt", // FIFO: order paling lama menunggu dikerjakan dulu
  });

  const majukan = useMajukanStatus();
  const [dialog, setDialog] = useState({ open: false, order: null });
  const tutupDialog = () => setDialog({ open: false, order: null });

  const selesaiDesain = (values) => {
    const target = dialog.order;
    if (!target) return;
    majukan.mutate(
      { id: target._id, ...values },
      { onSuccess: tutupDialog }
    );
  };

  const orders = data?.items ?? [];

  return (
    <section>
      <header className="mb-5">
        <h1 className="text-3xl font-bold text-slate-900">Antrian Desain</h1>
        <p className="mt-1 text-sm text-slate-500">
          {data?.pagination
            ? `${data.pagination.total} order menunggu desain.`
            : "Order yang menunggu proses desain."}
        </p>
      </header>

      <div className="mb-4 sm:max-w-xs">
        <TextField
          label="Cari order"
          type="search"
          placeholder="Kode order (mis. DTF/220826/001)"
          value={inputCari}
          onChange={(e) => setInputCari(e.target.value)}
        />
      </div>

      {error && (
        <div className="mb-4">
          <Alert tone="error" title={error.message} messages={error.errors} />
        </div>
      )}

      <OrderTable
        orders={orders}
        columns={["kode", "jenis", "pelanggan", "deadline", "tanggal"]}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyText={
          search
            ? `Tidak ada order yang cocok dengan "${search}".`
            : "Tidak ada order di antrian desain."
        }
        renderAction={(order) => (
          <Button
            size="sm"
            onClick={() => {
              majukan.reset();
              setDialog({ open: true, order });
            }}
          >
            Selesai Desain
          </Button>
        )}
      />

      <Modal
        open={dialog.open}
        onClose={tutupDialog}
        title="Selesai Desain"
        description="Tandai desain selesai. Order akan maju ke antrian produksi."
      >
        <SelesaiDesainForm
          order={dialog.order}
          onSubmit={selesaiDesain}
          onCancel={tutupDialog}
          isSubmitting={majukan.isPending}
          errorMessage={majukan.error?.message}
          errorDetails={majukan.error?.errors}
        />
      </Modal>
    </section>
  );
}
