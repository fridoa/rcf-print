import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  InfiniteScroll,
  Modal,
  Pagination,
  SelectField,
  TextField,
} from "@/shared/components/ui";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useIsDesktop } from "@/shared/hooks/useMediaQuery";
import { OrderTable } from "../components/OrderTable";
import { SelesaikanOrderForm } from "../components/SelesaikanOrderForm";
import { KoreksiStatusForm } from "../components/KoreksiStatusForm";
import { OrderForm } from "../components/OrderForm";
import { OrderDetailDialog } from "../components/OrderDetailDialog";
import { OrderReadyWhatsappDialog } from "../components/OrderReadyWhatsappDialog";
import { StatusBadge } from "../components/StatusBadge";
import {
  JENIS_LIST,
  JENIS_LABEL,
  STATUS,
  STATUS_LIST,
  STATUS_LABEL,
} from "../constants/order.constants";
import { useOrders, useInfiniteOrders } from "../hooks/useOrders";
import {
  useCreateOrder,
  useSelesaikanOrder,
  useKoreksiStatus,
} from "../hooks/useOrderMutations";

const JENIS_FILTER = [
  { value: "", label: "Semua jenis" },
  ...JENIS_LIST.map((j) => ({ value: j, label: JENIS_LABEL[j] ?? j })),
];

const STATUS_FILTER = [
  { value: "", label: "Semua status" },
  ...STATUS_LIST.map((s) => ({ value: s, label: STATUS_LABEL[s] ?? s })),
];

/**
 * Halaman ADMIN "Pesanan" — pusat kendali order.
 *
 * Beda dari layar produksi (WorkQueuePage): ini menampilkan SEMUA order
 * dengan filter jenis/status/pencarian, dan dua aksi khusus admin:
 *   - Buat order baru (OrderForm)
 *   - Selesaikan order READY + catat pembayaran (SelesaikanOrderForm)
 *
 * Filter & pencarian di query string (mengikuti pola CustomerListPage &
 * UserListPage) supaya bisa di-bookmark dan tombol Back berperilaku wajar.
 */
export function PesananPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const jenis = searchParams.get("jenis") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 10);

  const [inputSearch, setInputSearch] = useState(search);
  const searchDitunda = useDebouncedValue(inputSearch);

  const setFilter = (patch, { resetPage = true } = {}) => {
    const next = {
      search,
      jenis,
      status,
      page: String(page),
      limit: String(limit),
      ...patch,
    };
    if (resetPage && !("page" in patch)) next.page = "1";

    const params = {};
    if (next.search) params.search = next.search;
    if (next.jenis) params.jenis = next.jenis;
    if (next.status) params.status = next.status;
    if (Number(next.page) > 1) params.page = next.page;
    if (Number(next.limit) !== 10) params.limit = next.limit;

    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if (searchDitunda === search) return;
    setFilter({ search: searchDitunda });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDitunda]);

  const [dialog, setDialog] = useState({ mode: null, order: null });
  const tutupDialog = () => setDialog({ mode: null, order: null });

  // Dialog WhatsApp siap ambil untuk order READY
  const [waOrder, setWaOrder] = useState(null);

  // Dialog detail/tracking dipisah dari `dialog` aksi supaya membuka detail
  // tidak mengganggu state form (buat/selesai/koreksi) dan sebaliknya.
  const [detailId, setDetailId] = useState(null);

  // Desktop: paginasi tombol. HP: infinite scroll. Filter API dipakai kedua
  // hook; yang tak aktif dimatikan via enabled. (Lihat CustomerListPage.)
  const isDesktop = useIsDesktop();

  const filterApi = {
    search,
    jenis: jenis || undefined,
    status: status || undefined,
    // Tanpa filter status eksplisit, sembunyikan order SELESAI supaya daftar
    // fokus ke pekerjaan yang masih berjalan. Order selesai tetap bisa dilihat
    // dengan memilih status "Selesai" di filter (status mengalahkan aktif).
    aktif: status ? undefined : true,
  };

  const paged = useOrders(
    { ...filterApi, page, limit },
    { enabled: isDesktop }
  );

  const infinite = useInfiniteOrders(
    { ...filterApi, limit },
    { enabled: !isDesktop }
  );

  const createMutation = useCreateOrder();
  const selesaikanMutation = useSelesaikanOrder();
  const koreksiMutation = useKoreksiStatus();

  const isLoading = isDesktop ? paged.isLoading : infinite.isLoading;
  const isFetching = isDesktop ? paged.isFetching : infinite.isFetching;
  const error = isDesktop ? paged.error : infinite.error;
  const pagination = paged.data?.pagination;

  const orders = useMemo(() => {
    if (isDesktop) return paged.data?.items ?? [];
    return infinite.data?.pages.flatMap((p) => p.items) ?? [];
  }, [isDesktop, paged.data, infinite.data]);

  const totalOrder = isDesktop
    ? pagination?.total
    : infinite.data?.pages[0]?.pagination?.total;

  const gantiHalaman = (halamanBaru) =>
    setFilter({ page: String(halamanBaru) }, { resetPage: false });

  // Ganti limit: reset ke halaman 1 supaya offset tidak melewati total data.
  const gantiLimit = (limitBaru) => setFilter({ limit: String(limitBaru) });

  const simpanBaru = (values) => {
    createMutation.mutate(values, { onSuccess: tutupDialog });
  };

  const simpanSelesai = (values) => {
    const target = dialog.order;
    if (!target) return;
    selesaikanMutation.mutate(
      { id: target._id, ...values },
      { onSuccess: tutupDialog }
    );
  };

  const simpanKoreksi = (values) => {
    const target = dialog.order;
    if (!target) return;
    koreksiMutation.mutate(
      { id: target._id, ...values },
      { onSuccess: tutupDialog }
    );
  };

  return (
    <section>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Order Aktif</h1>
          <p className="mt-1 text-sm text-slate-500">
            {typeof totalOrder === "number"
              ? status
                ? `${totalOrder} order berstatus ${STATUS_LABEL[status] ?? status}.`
                : `${totalOrder} order aktif (yang sudah selesai disembunyikan).`
              : "Semua order RCF Print."}
          </p>
        </div>

        <Button
          onClick={() => {
            createMutation.reset();
            setDialog({ mode: "tambah", order: null });
          }}
        >
          Buat Order
        </Button>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <TextField
          label="Cari order"
          type="search"
          placeholder="Kode order (mis. DTF/220826/001)"
          value={inputSearch}
          onChange={(e) => setInputSearch(e.target.value)}
        />

        <SelectField
          label="Jenis"
          options={JENIS_FILTER}
          value={jenis}
          onChange={(e) => setFilter({ jenis: e.target.value })}
        />

        <SelectField
          label="Status"
          options={STATUS_FILTER}
          value={status}
          onChange={(e) => setFilter({ status: e.target.value })}
        />
      </div>

      {error && (
        <div className="mb-4">
          <Alert tone="error" title={error.message} messages={error.errors} />
        </div>
      )}

      <OrderTable
        orders={orders}
        columns={[
          "kode",
          "jenis",
          "pelanggan",
          "qty",
          "file",
          "harga",
          "status",
          "tanggal",
        ]}
        isLoading={isLoading}
        isFetching={isFetching}
        renderAction={(order) => (
          <div className="flex items-center justify-end gap-2">
            {order.status === STATUS.READY ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300"
                  onClick={() => setWaOrder(order)}
                >
                  <svg
                    className="size-3.5 fill-emerald-600"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  Kabari WA
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    selesaikanMutation.reset();
                    setDialog({ mode: "selesai", order });
                  }}
                >
                  Selesaikan
                </Button>
              </>
            ) : (
              <StatusBadge status={order.status} />
            )}

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setDetailId(order._id)}
            >
              Detail
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                koreksiMutation.reset();
                setDialog({ mode: "koreksi", order });
              }}
            >
              Koreksi
            </Button>
          </div>
        )}
      />

      {/* Desktop: paginasi tombol. HP: infinite scroll otomatis. */}
      {isDesktop
        ? pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPageChange={gantiHalaman}
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
              endText="Semua order sudah dimuat."
            />
          )}

      <Modal
        open={dialog.mode === "tambah"}
        onClose={tutupDialog}
        title="Buat Order Baru"
        description="Detail desain diisi tim desain, harga diisi saat serah terima."
      >
        <OrderForm
          onSubmit={simpanBaru}
          onCancel={tutupDialog}
          isSubmitting={createMutation.isPending}
          errorMessage={createMutation.error?.message}
          errorDetails={createMutation.error?.errors}
        />
      </Modal>

      <Modal
        open={dialog.mode === "selesai"}
        onClose={tutupDialog}
        title="Selesaikan Order"
      >
        <SelesaikanOrderForm
          order={dialog.order}
          onSubmit={simpanSelesai}
          onCancel={tutupDialog}
          isSubmitting={selesaikanMutation.isPending}
          errorMessage={selesaikanMutation.error?.message}
          errorDetails={selesaikanMutation.error?.errors}
        />
      </Modal>

      <Modal
        open={dialog.mode === "koreksi"}
        onClose={tutupDialog}
        title="Koreksi Status"
        description="Pindahkan status secara manual bila terjadi salah klik. Wajib mencatat alasan."
      >
        <KoreksiStatusForm
          order={dialog.order}
          onSubmit={simpanKoreksi}
          onCancel={tutupDialog}
          isSubmitting={koreksiMutation.isPending}
          errorMessage={koreksiMutation.error?.message}
          errorDetails={koreksiMutation.error?.errors}
        />
      </Modal>

      <OrderDetailDialog
        open={Boolean(detailId)}
        orderId={detailId}
        onClose={() => setDetailId(null)}
      />

      <OrderReadyWhatsappDialog
        open={Boolean(waOrder)}
        order={waOrder}
        onClose={() => setWaOrder(null)}
      />
    </section>
  );
}

