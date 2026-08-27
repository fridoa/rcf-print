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
import { ROLE_LIST, ROLE_LABEL } from "@/shared/constants/roles";
import { useAuth } from "@/features/auth";
import { UserTable } from "../components/UserTable";
import { UserForm } from "../components/UserForm";
import { ResetPasswordForm } from "../components/ResetPasswordForm";
import { DeleteUserConfirm } from "../components/DeleteUserConfirm";
import { useUsers, useInfiniteUsers } from "../hooks/useUsers";
import {
  useCreateUser,
  useDeleteUser,
  useResetUserPassword,
  useUpdateUser,
} from "../hooks/useUserMutations";

const ROLE_FILTER_OPTIONS = [
  { value: "", label: "Semua role" },
  ...ROLE_LIST.map((role) => ({ value: role, label: ROLE_LABEL[role] ?? role })),
];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Semua status" },
  { value: "true", label: "Aktif" },
  { value: "false", label: "Nonaktif" },
];

/**
 * Halaman manajemen user (khusus ADMIN — dijaga RequireRole di router).
 *
 * Mengikuti pola CustomerListPage: kata kunci/filter/halaman di query string
 * supaya bisa di-bookmark dan tombol Back berperilaku wajar, satu state
 * `dialog` supaya tidak mungkin dua dialog terbuka sekaligus.
 *
 * Filter role & status ditaruh di URL juga; keduanya langsung (tanpa
 * debounce) karena dropdown tidak menghasilkan ketikan beruntun seperti
 * kotak pencarian.
 */
export function UserListPage() {
  const { user: currentUser } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const role = searchParams.get("role") ?? "";
  const status = searchParams.get("status") ?? ""; // "", "true", "false"
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 10);

  const [inputSearch, setInputSearch] = useState(search);
  const searchDitunda = useDebouncedValue(inputSearch);

  /**
   * Bangun query string baru dari gabungan yang sekarang + perubahan.
   * page selalu di-reset saat filter berubah supaya tidak "nyangkut" di
   * halaman 5 padahal hasil filter baru cuma 1 halaman.
   */
  const setFilter = (patch, { resetPage = true } = {}) => {
    const next = {
      search,
      role,
      status,
      page: String(page),
      limit: String(limit),
      ...patch,
    };
    if (resetPage && !("page" in patch)) next.page = "1";

    const params = {};
    if (next.search) params.search = next.search;
    if (next.role) params.role = next.role;
    if (next.status) params.status = next.status;
    if (Number(next.page) > 1) params.page = next.page;
    if (Number(next.limit) !== 10) params.limit = next.limit;

    setSearchParams(params, { replace: true });
  };

  // Sinkronkan hasil debounce pencarian ke URL (lihat catatan sama di
  // CustomerListPage: harus di effect, bukan badan render).
  useEffect(() => {
    if (searchDitunda === search) return;
    setFilter({ search: searchDitunda });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDitunda]);

  const [dialog, setDialog] = useState({ mode: null, user: null });
  const tutupDialog = () => setDialog({ mode: null, user: null });

  // Desktop: paginasi tombol. HP: infinite scroll. Hook yang tak dipakai
  // dimatikan via enabled supaya tak dobel tembak API. (Lihat CustomerListPage.)
  const isDesktop = useIsDesktop();

  const filterApi = {
    search,
    role: role || undefined,
    isActive: status === "" ? undefined : status,
  };

  const paged = useUsers(
    { ...filterApi, page, limit },
    { enabled: isDesktop }
  );

  const infinite = useInfiniteUsers(
    { ...filterApi, limit },
    { enabled: !isDesktop }
  );

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const resetMutation = useResetUserPassword();
  const deleteMutation = useDeleteUser();

  const isLoading = isDesktop ? paged.isLoading : infinite.isLoading;
  const isFetching = isDesktop ? paged.isFetching : infinite.isFetching;
  const error = isDesktop ? paged.error : infinite.error;
  const pagination = paged.data?.pagination;

  const users = useMemo(() => {
    if (isDesktop) return paged.data?.items ?? [];
    return infinite.data?.pages.flatMap((p) => p.items) ?? [];
  }, [isDesktop, paged.data, infinite.data]);

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

  // Pola guard-lokal sama dengan CustomerListPage: ambil objek ke variabel,
  // cek null, baru baca ._id — supaya aman dari pengangkatan React Compiler.
  const simpanUbahan = (diff) => {
    const target = dialog.user;
    if (!target) return;
    updateMutation.mutate({ id: target._id, ...diff }, { onSuccess: tutupDialog });
  };

  const simpanPasswordBaru = ({ newPassword }) => {
    const target = dialog.user;
    if (!target) return;
    resetMutation.mutate({ id: target._id, newPassword });
  };

  const konfirmasiHapus = () => {
    const target = dialog.user;
    if (!target) return;
    deleteMutation.mutate(target._id, { onSuccess: tutupDialog });
  };

  return (
    <section>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pengguna</h1>
          <p className="mt-1 text-sm text-slate-500">
            {typeof totalTerdaftar === "number"
              ? `${totalTerdaftar} user terdaftar.`
              : "Kelola akun dan hak akses pengguna sistem."}
          </p>
        </div>

        <Button
          onClick={() => {
            createMutation.reset();
            setDialog({ mode: "tambah", user: null });
          }}
        >
          Tambah User
        </Button>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <TextField
          label="Cari user"
          type="search"
          placeholder="Nama, username, atau email"
          value={inputSearch}
          onChange={(e) => setInputSearch(e.target.value)}
        />

        <SelectField
          label="Role"
          options={ROLE_FILTER_OPTIONS}
          value={role}
          onChange={(e) => setFilter({ role: e.target.value })}
        />

        <SelectField
          label="Status"
          options={STATUS_FILTER_OPTIONS}
          value={status}
          onChange={(e) => setFilter({ status: e.target.value })}
        />
      </div>

      {error && (
        <div className="mb-4">
          <Alert tone="error" title={error.message} messages={error.errors} />
        </div>
      )}

      <UserTable
        users={users}
        isLoading={isLoading}
        isFetching={isFetching}
        currentUserId={currentUser?._id}
        onEdit={(user) => {
          updateMutation.reset();
          setDialog({ mode: "ubah", user });
        }}
        onResetPassword={(user) => {
          resetMutation.reset();
          setDialog({ mode: "reset", user });
        }}
        onDelete={(user) => {
          deleteMutation.reset();
          setDialog({ mode: "hapus", user });
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
          users.length > 0 && (
            <InfiniteScroll
              hasNextPage={infinite.hasNextPage}
              isFetchingNextPage={infinite.isFetchingNextPage}
              onLoadMore={infinite.fetchNextPage}
              endText="Semua user sudah dimuat."
            />
          )}

      <Modal
        open={dialog.mode === "tambah"}
        onClose={tutupDialog}
        title="Tambah User"
        description="User baru bisa langsung login dengan password yang kamu setel."
      >
        <UserForm
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
        title="Ubah User"
        description="Hanya field yang kamu ubah yang dikirim ke server."
      >
        <UserForm
          user={dialog.user}
          onSubmit={simpanUbahan}
          onCancel={tutupDialog}
          isSubmitting={updateMutation.isPending}
          errorMessage={updateMutation.error?.message}
          errorDetails={updateMutation.error?.errors}
        />
      </Modal>

      <Modal
        open={dialog.mode === "reset"}
        onClose={tutupDialog}
        title="Reset Password"
      >
        <ResetPasswordForm
          user={dialog.user}
          onSubmit={simpanPasswordBaru}
          onCancel={tutupDialog}
          isSubmitting={resetMutation.isPending}
          errorMessage={resetMutation.error?.message}
          errorDetails={resetMutation.error?.errors}
          successMessage={
            resetMutation.isSuccess ? "Password berhasil direset" : undefined
          }
        />
      </Modal>

      <Modal open={dialog.mode === "hapus"} onClose={tutupDialog} title="Hapus User">
        <DeleteUserConfirm
          user={dialog.user}
          onConfirm={konfirmasiHapus}
          onCancel={tutupDialog}
          isDeleting={deleteMutation.isPending}
          errorMessage={deleteMutation.error?.message}
        />
      </Modal>
    </section>
  );
}
