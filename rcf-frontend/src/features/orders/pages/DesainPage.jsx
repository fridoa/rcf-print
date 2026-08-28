import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  InfiniteScroll,
  Modal,
  Pagination,
  TextField,
} from "@/shared/components/ui";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useIsDesktop } from "@/shared/hooks/useMediaQuery";
import { OrderTable } from "../components/OrderTable";
import { SelesaiDesainForm } from "../components/SelesaiDesainForm";
import { STATUS } from "../constants/order.constants";
import { useOrders, useInfiniteOrders } from "../hooks/useOrders";
import { useMajukanStatus } from "../hooks/useOrderMutations";

/**
 * Layar Desain (peran DESIGNER).
 *
 * Menampilkan antrian ANTRI_DESAIN untuk KEDUA jenis (DTF & Polyflex sama-sama
 * lewat tahap desain, sesuai ERD). Memajukan order dari sini menandai desain
 * selesai — file & qty sudah tercatat saat order dibuat, jadi form hanya
 * mengumpulkan catatan opsional untuk operator produksi.
 *
 * Paginasi mengikuti pola WorkQueuePage: desktop = tombol + selector limit,
 * HP = infinite scroll. (Sebelumnya hardcode limit:50 tanpa pagination —
 * order ke-51+ tidak terlihat siapa pun.)
 */
export function DesainPage() {
  // Paginasi antrian: state lokal (bukan URL) — antrian bukan halaman yang
  // di-bookmark, cukup navigasi sesi. Limit 10 sama dengan antrian lain.
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Pencarian kode order / pelanggan (debounced supaya tak menembak API tiap
  // huruf). Ganti kata kunci → balik ke halaman 1 (hasil filter beda).
  const [inputCari, setInputCari] = useState("");
  const search = useDebouncedValue(inputCari);

  const gantiCari = (nilai) => {
    setInputCari(nilai);
    setPage(1);
  };

  const gantiLimit = (limitBaru) => {
    setLimit(limitBaru);
    setPage(1); // reset supaya offset tidak melewati total data
  };

  // Desktop: paginasi tombol. HP: infinite scroll.
  const isDesktop = useIsDesktop();

  const filterApi = {
    status: STATUS.ANTRI_DESAIN,
    search,
    sort: "createdAt", // FIFO: order paling lama menunggu dikerjakan dulu
  };

  const paged = useOrders(
    { ...filterApi, page, limit },
    { enabled: isDesktop }
  );
  const infinite = useInfiniteOrders(
    { ...filterApi, limit },
    { enabled: !isDesktop }
  );

  const isLoading = isDesktop ? paged.isLoading : infinite.isLoading;
  const isFetching = isDesktop ? paged.isFetching : infinite.isFetching;
  const error = isDesktop ? paged.error : infinite.error;
  const pagination = paged.data?.pagination;

  const orders = useMemo(() => {
    if (isDesktop) return paged.data?.items ?? [];
    return infinite.data?.pages.flatMap((p) => p.items) ?? [];
  }, [isDesktop, paged.data, infinite.data]);

  const totalAntrian = isDesktop
    ? pagination?.total
    : infinite.data?.pages[0]?.pagination?.total;

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

  return (
    <section>
      <header className="mb-5">
        <h1 className="text-3xl font-bold text-slate-900">Antrian Desain</h1>
        <p className="mt-1 text-sm text-slate-500">
          {typeof totalAntrian === "number"
            ? `${totalAntrian} order menunggu desain.`
            : "Order yang menunggu proses desain."}
        </p>
      </header>

      <div className="mb-4 sm:max-w-xs">
        <TextField
          label="Cari order"
          type="search"
          placeholder="Kode order (mis. DTF/220826/001)"
          value={inputCari}
          onChange={(e) => gantiCari(e.target.value)}
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

      {/* Desktop: paginasi tombol. HP: infinite scroll otomatis. */}
      {isDesktop
        ? pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPageChange={setPage}
              limit={limit}
              onLimitChange={gantiLimit}
              disabled={isFetching}
            />
          )
        : !isLoading &&
          orders.length > 0 && (
            <InfiniteScroll
              hasNextPage={infinite.hasNextPage}
              isFetchingNextPage={infinite.isFetchingNextPage}
              onLoadMore={infinite.fetchNextPage}
              endText="Semua order antrian sudah dimuat."
            />
          )}

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
