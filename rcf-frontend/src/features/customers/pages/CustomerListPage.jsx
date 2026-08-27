import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { ROLES } from "@/shared/constants/roles";
import { useAuth } from "@/features/auth";
import { CustomerTable } from "../components/CustomerTable";
import { CustomerForm } from "../components/CustomerForm";
import { DeleteCustomerConfirm } from "../components/DeleteCustomerConfirm";
import { useCustomers, useInfiniteCustomers } from "../hooks/useCustomers";
import {
  useCreateCustomer,
  useDeleteCustomer,
  useUpdateCustomer,
} from "../hooks/useCustomerMutations";

/**
 * Halaman daftar pelanggan.
 *
 * Kata kunci & halaman disimpan di query string (?search=&page=), bukan
 * useState biasa. Alasannya: hasil pencarian jadi bisa di-bookmark dan
 * di-share, dan tombol Back browser berperilaku seperti yang diharapkan.
 *
 * Dialog tambah/ubah/hapus dikendalikan satu state `dialog` supaya tidak
 * mungkin dua dialog terbuka sekaligus.
 */
export function CustomerListPage() {
  const { user } = useAuth();
  const canManage = user?.role === ROLES.ADMIN;

  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);

  const [inputSearch, setInputSearch] = useState(search);
  const searchDitunda = useDebouncedValue(inputSearch);

  // Bangun query string dari gabungan state sekarang + perubahan. Dipakai
  // semua pengubah (search/page/limit) supaya tak ada param yang tak sengaja
  // hilang saat salah satunya berubah.
  const setFilter = (patch, { resetPage = true } = {}) => {
    const next = { search, page: String(page), limit: String(limit), ...patch };
    if (resetPage && !("page" in patch)) next.page = "1";

    const params = {};
    if (next.search) params.search = next.search;
    if (Number(next.page) > 1) params.page = next.page;
    if (Number(next.limit) !== 20) params.limit = next.limit;

    setSearchParams(params, { replace: true });
  };

  // Sinkronkan hasil debounce ke URL. Wajib di dalam effect, bukan di
  // badan render: setSearchParams saat render adalah efek samping yang
  // memicu render ulang tanpa henti.
  //
  // replace: true supaya setiap ketikan tidak menumpuk entri history —
  // tombol Back harus kembali ke halaman sebelumnya, bukan ke kata kunci
  // setengah jadi.
  useEffect(() => {
    if (searchDitunda === search) return;
    setFilter({ search: searchDitunda });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDitunda]);

  const [dialog, setDialog] = useState({ mode: null, customer: null });
  const tutupDialog = () => setDialog({ mode: null, customer: null });

  // Di desktop: paginasi tombol (query useCustomers). Di HP: infinite scroll
  // (useInfiniteCustomers). Hook yang tidak dipakai dimatikan via enabled
  // supaya tidak menembak API dua kali. keepPreviousData di desktop menjaga
  // daftar tidak berkedip saat pindah halaman.
  const isDesktop = useIsDesktop();

  const paged = useCustomers(
    { search, page, limit },
    { enabled: isDesktop }
  );

  const infinite = useInfiniteCustomers(
    { search, limit },
    { enabled: !isDesktop }
  );

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  // Ratakan sumber data jadi satu bentuk supaya bagian render tidak bercabang.
  const isLoading = isDesktop ? paged.isLoading : infinite.isLoading;
  const isFetching = isDesktop ? paged.isFetching : infinite.isFetching;
  const error = isDesktop ? paged.error : infinite.error;
  const pagination = paged.data?.pagination;

  const customers = useMemo(() => {
    if (isDesktop) return paged.data?.items ?? [];
    return infinite.data?.pages.flatMap((p) => p.items) ?? [];
  }, [isDesktop, paged.data, infinite.data]);

  // Total terdaftar: dari pagination (desktop) atau halaman pertama (HP).
  const totalTerdaftar = isDesktop
    ? pagination?.total
    : infinite.data?.pages[0]?.pagination?.total;

  const gantiHalaman = (halamanBaru) =>
    setFilter({ page: String(halamanBaru) }, { resetPage: false });

  // Ganti limit: reset ke halaman 1 supaya offset tidak melewati total data.
  const gantiLimit = (limitBaru) => setFilter({ limit: String(limitBaru) });

  const simpanBaru = (values) => {
    createMutation.mutate(values, { onSuccess: tutupDialog });
  };

  /**
   * Ambil dulu objeknya ke variabel lokal, cek null, baru baca `._id`.
   *
   * Menulis `dialog.customer._id` langsung di dalam callback tampak aman
   * (callback hanya jalan setelah dialog dibuka), tapi React Compiler
   * mengangkat pembacaan properti dependensi closure ke badan render untuk
   * memoisasi — jadi `null._id` dilempar begitu halaman dibuka, sebelum
   * ada dialog sama sekali. Pola guard di bawah tidak bisa diangkat.
   */
  const simpanUbahan = (diff) => {
    const target = dialog.customer;
    if (!target) return;

    updateMutation.mutate({ id: target._id, ...diff }, { onSuccess: tutupDialog });
  };

  const konfirmasiHapus = () => {
    const target = dialog.customer;
    if (!target) return;

    deleteMutation.mutate(target._id, { onSuccess: tutupDialog });
  };

  return (
    <section>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pelanggan</h1>
          <p className="mt-1 text-sm text-slate-500">
            {typeof totalTerdaftar === "number"
              ? `${totalTerdaftar} pelanggan terdaftar.`
              : "Data pelanggan RCF Print."}
          </p>
        </div>

        {canManage && (
          <Button
            onClick={() => {
              createMutation.reset();
              setDialog({ mode: "tambah", customer: null });
            }}
          >
            Tambah Pelanggan
          </Button>
        )}
      </header>

      <div className="mb-4 max-w-sm">
        <TextField
          label="Cari pelanggan"
          type="search"
          placeholder="Nama atau nomor WhatsApp"
          value={inputSearch}
          onChange={(e) => setInputSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="mb-4">
          <Alert tone="error" title={error.message} messages={error.errors} />
        </div>
      )}

      <CustomerTable
        customers={customers}
        isLoading={isLoading}
        isFetching={isFetching}
        canManage={canManage}
        onEdit={(customer) => {
          updateMutation.reset();
          setDialog({ mode: "ubah", customer });
        }}
        onDelete={(customer) => {
          deleteMutation.reset();
          setDialog({ mode: "hapus", customer });
        }}
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
          customers.length > 0 && (
            <InfiniteScroll
              hasNextPage={infinite.hasNextPage}
              isFetchingNextPage={infinite.isFetchingNextPage}
              onLoadMore={infinite.fetchNextPage}
              endText="Semua pelanggan sudah dimuat."
            />
          )}

      <Modal
        open={dialog.mode === "tambah"}
        onClose={tutupDialog}
        title="Tambah Pelanggan"
        description="Nomor WhatsApp dipakai untuk mengabari pelanggan saat pesanan siap."
      >
        <CustomerForm
          onSubmit={simpanBaru}
          onCancel={tutupDialog}
          isSubmitting={createMutation.isPending}
          errorMessage={createMutation.error?.message}
          errorDetails={createMutation.error?.errors}
        />
      </Modal>

      <Modal
        open={dialog.mode === "ubah"}
        onClose={tutupDialog}
        title="Ubah Pelanggan"
        description="Hanya field yang kamu ubah yang dikirim ke server."
      >
        <CustomerForm
          customer={dialog.customer}
          onSubmit={simpanUbahan}
          onCancel={tutupDialog}
          isSubmitting={updateMutation.isPending}
          errorMessage={updateMutation.error?.message}
          errorDetails={updateMutation.error?.errors}
        />
      </Modal>

      <Modal
        open={dialog.mode === "hapus"}
        onClose={tutupDialog}
        title="Hapus Pelanggan"
      >
        <DeleteCustomerConfirm
          customer={dialog.customer}
          onConfirm={konfirmasiHapus}
          onCancel={tutupDialog}
          isDeleting={deleteMutation.isPending}
          errorMessage={deleteMutation.error?.message}
        />
      </Modal>
    </section>
  );
}
