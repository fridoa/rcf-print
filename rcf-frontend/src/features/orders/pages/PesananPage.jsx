import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  ConfirmDialog,
  DateRangePickerField,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuDivider,
  InfiniteScroll,
  Modal,
  Pagination,
  SelectField,
  TextField,
} from "@/shared/components/ui";

import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useIsDesktop } from "@/shared/hooks/useMediaQuery";
import { formatTanggal } from "@/shared/lib/format";
import { OrderTable } from "../components/OrderTable";
import { SelesaikanOrderForm } from "../components/SelesaikanOrderForm";
import { KoreksiStatusForm } from "../components/KoreksiStatusForm";
import { OrderForm } from "../components/OrderForm";
import { OrderDetailDialog } from "../components/OrderDetailDialog";
import { OrderReadyWhatsappDialog } from "../components/OrderReadyWhatsappDialog";
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
  useUpdateOrder,
  useDeleteOrder,
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
 *
 * Filter tanggal berbasis tgl_order lewat satu kalender rentang
 * (DateRangePickerField), dan SENGAJA kosong secara default. Alasannya:
 * halaman ini sudah menyembunyikan order SELESAI (aktif: true), jadi tanpa
 * rentang isinya = semua kerjaan yang masih jalan — persis yang perlu
 * dilihat, dan tidak ada yang hilang karena batas tanggal. Rentang bawaan
 * "bulan ini" justru menyusahkan di awal bulan (tanggal 1 = rentang sehari).
 * Kalender dipakai saat menelusuri riwayat atau saat memilih status Selesai.
 *
 * Kalau admin memasang rentang, backend mengabarkan berapa order belum
 * selesai yang jatuh di luar rentang (meta.aktif_di_luar_rentang) dan halaman
 * menawarkan menampilkannya — filter tetap jujur, tapi tidak ada kerjaan yang
 * hilang diam-diam.
 */
export function PesananPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const jenis = searchParams.get("jenis") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 10);

  // Rentang tanggal murni dari URL — kosong berarti tanpa filter tanggal.
  const rentang = {
    dari: searchParams.get("dari") ?? "",
    sampai: searchParams.get("sampai") ?? "",
  };

  // Order aktif di luar rentang ikut ditampilkan?
  const sertakanLuar = searchParams.get("luar") === "1";

  // Teks rentang untuk subjudul. Rentang dianggap ada hanya kalau kedua
  // ujungnya terisi — kalender bisa berada di tengah pemilihan (baru satu
  // klik), dan saat itu belum ada filter yang dikirim ke backend.
  const adaRentang = Boolean(rentang.dari && rentang.sampai);
  const labelRentang = adaRentang
    ? `${formatTanggal(rentang.dari)} – ${formatTanggal(rentang.sampai)}`
    : "";

  const [inputSearch, setInputSearch] = useState(search);
  const searchDitunda = useDebouncedValue(inputSearch);

  const setFilter = (patch, { resetPage = true } = {}) => {
    const next = {
      search,
      jenis,
      status,
      dari: rentang.dari,
      sampai: rentang.sampai,
      luar: sertakanLuar ? "1" : "",
      page: String(page),
      limit: String(limit),
      ...patch,
    };
    if (resetPage && !("page" in patch)) next.page = "1";

    const params = {};
    if (next.search) params.search = next.search;
    if (next.jenis) params.jenis = next.jenis;
    if (next.status) params.status = next.status;
    if (next.dari) params.dari = next.dari;
    if (next.sampai) params.sampai = next.sampai;
    if (next.luar === "1") params.luar = "1";
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
    // Rentang dikirim hanya kalau lengkap. Mengirim satu ujung saja membuat
    // filter setengah jalan (mis. "dari 5 Agu sampai kapan pun") tepat saat
    // admin baru mengklik tanggal pertama di kalender.
    tgl_dari: adaRentang ? rentang.dari : undefined,
    tgl_sampai: adaRentang ? rentang.sampai : undefined,
    sertakan_aktif_luar: sertakanLuar || undefined,
    // Grouping per tanggal hanya rapi kalau barisnya sudah urut per tanggal;
    // tanpa ini satu hari bisa terpecah jadi beberapa header.
    sort: "-tgl_order",
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
  const updateMutation = useUpdateOrder();
  const deleteMutation = useDeleteOrder();
  const selesaikanMutation = useSelesaikanOrder();
  const koreksiMutation = useKoreksiStatus();

  // Order yang menunggu konfirmasi penghapusan (ADMIN)
  const [orderHapus, setOrderHapus] = useState(null);

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

  // Jaring pengaman: berapa order belum selesai yang tersaring keluar rentang.
  const aktifDiLuar = isDesktop
    ? paged.data?.meta?.aktif_di_luar_rentang ?? 0
    : infinite.data?.pages[0]?.meta?.aktif_di_luar_rentang ?? 0;

  // Ganti rentang lewat kalender. "luar" ikut direset: rentangnya berubah,
  // jadi hitungan order aktif di luar rentang harus dihitung ulang dari nol.
  const gantiRentang = ({ dari, sampai }) =>
    setFilter({ dari, sampai, luar: "" });

  const gantiHalaman = (halamanBaru) =>
    setFilter({ page: String(halamanBaru) }, { resetPage: false });

  // Ganti limit: reset ke halaman 1 supaya offset tidak melewati total data.
  const gantiLimit = (limitBaru) => setFilter({ limit: String(limitBaru) });

  const simpanBaru = (values) => {
    createMutation.mutate(values, { onSuccess: tutupDialog });
  };

  const simpanEdit = (values) => {
    const target = dialog.order;
    if (!target) return;
    updateMutation.mutate(
      { id: target._id, ...values },
      { onSuccess: tutupDialog }
    );
  };

  const prosesHapus = () => {
    if (!orderHapus?._id) return;
    deleteMutation.mutate(orderHapus._id, {
      onSuccess: () => setOrderHapus(null),
    });
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
            {/* Tanpa rentang tanggal, subjudul tidak menyebut tanggal sama
                sekali — menulis "pada semua tanggal" hanya menambah kata
                tanpa menambah informasi. */}
            {typeof totalOrder === "number"
              ? [
                  status
                    ? `${totalOrder} order berstatus ${STATUS_LABEL[status] ?? status}`
                    : `${totalOrder} order aktif`,
                  adaRentang ? ` pada ${labelRentang}` : "",
                  status ? "." : " (yang sudah selesai disembunyikan).",
                ].join("")
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

      {/* Baris filter: pencarian di kiri, tiga penyaring ringkas di kanan.
          Pencarian dapat lebar tetap yang cukup untuk satu kode order penuh
          (w-72) — bukan flex-1, karena membentang sampai sisa baris membuat
          field kosong terlihat seperti input utama halaman. ml-auto pada grup
          kanan yang mendorongnya ke tepi. Di HP semuanya menumpuk penuh. */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <TextField
          className="w-full sm:w-72"
          label="Cari order"
          type="search"
          placeholder="Kode order (mis. DTF/220826/001)"
          value={inputSearch}
          onChange={(e) => setInputSearch(e.target.value)}
        />

        <div className="flex w-full flex-wrap items-end gap-3 sm:ml-auto sm:w-auto">
          <DateRangePickerField
            className="w-full sm:w-48"
            label="Tanggal order"
            dari={rentang.dari}
            sampai={rentang.sampai}
            onChange={gantiRentang}
          />

          <SelectField
            className="w-full sm:w-32"
            label="Jenis"
            options={JENIS_FILTER}
            value={jenis}
            onChange={(e) => setFilter({ jenis: e.target.value })}
          />

          <SelectField
            className="w-full sm:w-36"
            label="Status"
            options={STATUS_FILTER}
            value={status}
            onChange={(e) => setFilter({ status: e.target.value })}
          />
        </div>
      </div>

      {/* Jaring pengaman: kerjaan yang belum selesai tidak boleh hilang hanya
          karena tanggalnya di luar rentang. Filter tetap jujur (yang tampil
          memang sesuai rentang), tapi admin diberi tahu dan bisa menariknya. */}
      {aktifDiLuar > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <p className="text-sm text-amber-900">
            {aktifDiLuar} order belum selesai di luar rentang ini.
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setFilter({ luar: "1" })}
          >
            Tampilkan
          </Button>
        </div>
      )}

      {sertakanLuar && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
          <p className="text-sm text-slate-600">
            Order belum selesai dari luar rentang ikut ditampilkan.
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setFilter({ luar: "" })}
          >
            Sembunyikan
          </Button>
        </div>
      )}

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
        groupByTanggal
        renderAction={(order) => (
          <div className="flex items-center justify-end gap-2">
            {order.status === STATUS.READY && (
              <Button
                size="sm"
                onClick={() => {
                  selesaikanMutation.reset();
                  setDialog({ mode: "selesai", order });
                }}
              >
                Selesaikan
              </Button>
            )}

            <DropdownMenu align="right">
              <DropdownMenuItem
                icon={
                  <svg
                    className="size-4 text-slate-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                }
                onClick={() => setDetailId(order._id)}
              >
                Detail Order
              </DropdownMenuItem>

              {order.status === STATUS.READY && (
                <DropdownMenuItem
                  tone="success"
                  icon={
                    <svg
                      className="size-4 fill-emerald-600"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                  }
                  onClick={() => setWaOrder(order)}
                >
                  Kabari WhatsApp
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                icon={
                  <svg
                    className="size-4 text-slate-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                }
                onClick={() => {
                  updateMutation.reset();
                  setDialog({ mode: "edit", order });
                }}
              >
                Edit Order
              </DropdownMenuItem>

              <DropdownMenuItem
                icon={
                  <svg
                    className="size-4 text-slate-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M8 16H3v5" />
                  </svg>
                }
                onClick={() => {
                  koreksiMutation.reset();
                  setDialog({ mode: "koreksi", order });
                }}
              >
                Koreksi Status
              </DropdownMenuItem>

              <DropdownMenuDivider />

              <DropdownMenuItem
                tone="danger"
                icon={
                  <svg
                    className="size-4 text-danger-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" x2="10" y1="11" y2="17" />
                    <line x1="14" x2="14" y1="11" y2="17" />
                  </svg>
                }
                onClick={() => {
                  deleteMutation.reset();
                  setOrderHapus(order);
                }}
              >
                Hapus Order
              </DropdownMenuItem>
            </DropdownMenu>
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
        description="Jumlah file & qty diisi designer; harga diisi saat serah terima."
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

      <Modal
        open={dialog.mode === "edit"}
        onClose={tutupDialog}
        title={`Edit Order ${dialog.order?.kode_order ?? ""}`}
        description="Perbarui pelanggan, jenis, deadline, atau catatan order ini."
      >
        <OrderForm
          order={dialog.order}
          onSubmit={simpanEdit}
          onCancel={tutupDialog}
          isSubmitting={updateMutation.isPending}
          errorMessage={updateMutation.error?.message}
          errorDetails={updateMutation.error?.errors}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(orderHapus)}
        title="Hapus Order"
        description={
          orderHapus
            ? `Apakah Anda yakin ingin menghapus order ${orderHapus.kode_order}? Seluruh data dan riwayat order ini akan dihapus permanen.`
            : ""
        }
        confirmLabel="Hapus Order"
        cancelLabel="Batal"
        tone="danger"
        isLoading={deleteMutation.isPending}
        errorMessage={deleteMutation.error?.message}
        onConfirm={prosesHapus}
        onCancel={() => setOrderHapus(null)}
      />

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


