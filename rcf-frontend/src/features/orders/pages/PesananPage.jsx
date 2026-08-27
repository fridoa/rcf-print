import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Modal,
  Pagination,
  SelectField,
  TextField,
} from "@/shared/components/ui";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { OrderTable } from "../components/OrderTable";
import { SelesaikanOrderForm } from "../components/SelesaikanOrderForm";
import { KoreksiStatusForm } from "../components/KoreksiStatusForm";
import { OrderForm } from "../components/OrderForm";
import { OrderDetailDialog } from "../components/OrderDetailDialog";
import { StatusBadge } from "../components/StatusBadge";
import {
  JENIS_LIST,
  JENIS_LABEL,
  STATUS,
  STATUS_LIST,
  STATUS_LABEL,
} from "../constants/order.constants";
import { useOrders } from "../hooks/useOrders";
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
  const limit = Number(searchParams.get("limit") ?? 20);

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
    if (Number(next.limit) !== 20) params.limit = next.limit;

    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if (searchDitunda === search) return;
    setFilter({ search: searchDitunda });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDitunda]);

  const [dialog, setDialog] = useState({ mode: null, order: null });
  const tutupDialog = () => setDialog({ mode: null, order: null });

  // Dialog detail/tracking dipisah dari `dialog` aksi supaya membuka detail
  // tidak mengganggu state form (buat/selesai/koreksi) dan sebaliknya.
  const [detailId, setDetailId] = useState(null);

  const { data, isLoading, isFetching, error } = useOrders({
    search,
    jenis: jenis || undefined,
    status: status || undefined,
    // Tanpa filter status eksplisit, sembunyikan order SELESAI supaya daftar
    // fokus ke pekerjaan yang masih berjalan. Order selesai tetap bisa dilihat
    // dengan memilih status "Selesai" di filter (status mengalahkan aktif).
    aktif: status ? undefined : true,
    page,
    limit,
  });

  const createMutation = useCreateOrder();
  const selesaikanMutation = useSelesaikanOrder();
  const koreksiMutation = useKoreksiStatus();

  const pagination = data?.pagination;

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
            {pagination
              ? status
                ? `${pagination.total} order berstatus ${STATUS_LABEL[status] ?? status}.`
                : `${pagination.total} order aktif (yang sudah selesai disembunyikan).`
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
        orders={data?.items ?? []}
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
              <Button
                size="sm"
                onClick={() => {
                  selesaikanMutation.reset();
                  setDialog({ mode: "selesai", order });
                }}
              >
                Selesaikan
              </Button>
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

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={gantiHalaman}
          limit={limit}
          onLimitChange={gantiLimit}
          disabled={isFetching}
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
    </section>
  );
}
