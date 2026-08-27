import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  ConfirmDialog,
  InfiniteScroll,
  Pagination,
  TextField,
} from "@/shared/components/ui";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useIsDesktop } from "@/shared/hooks/useMediaQuery";
import { OrderTable } from "./OrderTable";
import { useOrders, useInfiniteOrders } from "../hooks/useOrders";
import { useMajukanStatus } from "../hooks/useOrderMutations";

/**
 * Kerangka layar antrian kerja satu peran (Cetak, Polyflex, Packing).
 *
 * Semua layar itu identik kecuali: judul, status yang difilter, dan teks
 * tombol aksi. Semuanya melakukan aksi "majukan satu langkah tanpa payload"
 * (Selesai Cetak / Selesai Cutting / Tandai Siap), jadi dikumpulkan di sini.
 *
 * Layar Desain TIDAK memakai ini — ia memakai form (catatan opsional) untuk
 * menandai desain selesai, lihat DesainPage.
 *
 * @param {object} props
 * @param {string} props.judul
 * @param {string} props.deskripsi
 * @param {string|string[]} props.status  status yang ditampilkan di antrian
 * @param {string} props.jenis            filter jenis opsional (DTF/POLYFLEX)
 * @param {string} props.aksiLabel        teks tombol maju (mis. "Selesai Cetak")
 * @param {string} props.emptyText
 * @param {string[]} props.columns
 */
export function WorkQueuePage({
  judul,
  deskripsi,
  status,
  jenis,
  aksiLabel,
  emptyText,
  columns = ["kode", "pelanggan", "qty", "file", "deadline", "status"],
}) {
  // Paginasi antrian: state lokal (bukan URL) — antrian bukan halaman yang
  // di-bookmark seperti Pesanan, cukup navigasi sesi.
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Pencarian kode order / pelanggan. Debounce supaya tidak memanggil API tiap
  // huruf; ganti kata kunci → balik ke halaman 1 (hasil filter beda).
  const [inputCari, setInputCari] = useState("");
  const search = useDebouncedValue(inputCari);

  const gantiCari = (nilai) => {
    setInputCari(nilai);
    setPage(1);
  };

  // Desktop: paginasi tombol. HP: infinite scroll. (Lihat PesananPage.)
  const isDesktop = useIsDesktop();

  const filterApi = { status, jenis, search, sort: "createdAt" }; // FIFO

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

  const gantiLimit = (limitBaru) => {
    setLimit(limitBaru);
    setPage(1); // reset supaya offset tidak melewati total data
  };

  const majukan = useMajukanStatus();
  const [barisError, setBarisError] = useState(null);
  // Order yang menunggu konfirmasi maju. null = tidak ada dialog terbuka.
  // Konfirmasi dulu supaya aksi tak sengaja "kepencet" tidak langsung jalan.
  const [konfirmasi, setKonfirmasi] = useState(null);

  const mintaKonfirmasi = (order) => {
    setBarisError(null);
    majukan.reset();
    setKonfirmasi(order);
  };

  const prosesMaju = () => {
    const order = konfirmasi;
    if (!order) return;
    majukan.mutate(
      { id: order._id },
      {
        onSuccess: () => setKonfirmasi(null),
        onError: (err) =>
          setBarisError({ id: order._id, message: err.message }),
      }
    );
  };

  return (
    <section>
      <header className="mb-5">
        <h1 className="text-3xl font-bold text-slate-900">{judul}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {typeof totalAntrian === "number"
            ? `${totalAntrian} order dalam antrian.`
            : deskripsi}
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

      {barisError && (
        <div className="mb-4">
          <Alert tone="error" title={barisError.message} />
        </div>
      )}

      <OrderTable
        orders={orders}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyText={
          search ? `Tidak ada order yang cocok dengan "${search}".` : emptyText
        }
        renderAction={(order) => (
          <Button
            size="sm"
            onClick={() => mintaKonfirmasi(order)}
            isLoading={majukan.isPending && majukan.variables?.id === order._id}
          >
            {aksiLabel}
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

      <ConfirmDialog
        open={Boolean(konfirmasi)}
        title={aksiLabel}
        description={
          konfirmasi
            ? `Majukan order ${konfirmasi.kode_order} ke tahap berikutnya? Status akan berubah dan aksi ini tercatat atas nama Anda.`
            : ""
        }
        confirmLabel={aksiLabel}
        cancelLabel="Batal"
        isLoading={majukan.isPending}
        errorMessage={majukan.error?.message}
        onConfirm={prosesMaju}
        onCancel={() => setKonfirmasi(null)}
      />
    </section>
  );
}
