import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Button, Modal, TextField } from "@/shared/components/ui";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { ROLES } from "@/shared/constants/roles";
import { useAuth } from "@/features/auth";
import { CustomerTable } from "../components/CustomerTable";
import { CustomerForm } from "../components/CustomerForm";
import { DeleteCustomerConfirm } from "../components/DeleteCustomerConfirm";
import { useCustomers } from "../hooks/useCustomers";
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

  const [inputSearch, setInputSearch] = useState(search);
  const searchDitunda = useDebouncedValue(inputSearch);

  // Sinkronkan hasil debounce ke URL. Wajib di dalam effect, bukan di
  // badan render: setSearchParams saat render adalah efek samping yang
  // memicu render ulang tanpa henti.
  //
  // replace: true supaya setiap ketikan tidak menumpuk entri history —
  // tombol Back harus kembali ke halaman sebelumnya, bukan ke kata kunci
  // setengah jadi.
  useEffect(() => {
    if (searchDitunda === search) return;

    setSearchParams(searchDitunda ? { search: searchDitunda } : {}, {
      replace: true,
    });
  }, [searchDitunda, search, setSearchParams]);

  const [dialog, setDialog] = useState({ mode: null, customer: null });
  const tutupDialog = () => setDialog({ mode: null, customer: null });

  const { data, isLoading, isFetching, error } = useCustomers({
    search,
    page,
    limit: 20,
  });

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const pagination = data?.pagination;

  const gantiHalaman = (halamanBaru) => {
    const params = {};
    if (search) params.search = search;
    if (halamanBaru > 1) params.page = String(halamanBaru);
    setSearchParams(params);
  };

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
          <h1 className="text-lg font-semibold text-slate-900">Pelanggan</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pagination
              ? `${pagination.total} pelanggan terdaftar.`
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
        customers={data?.items ?? []}
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

      {pagination && pagination.totalPages > 1 && (
        <nav
          aria-label="Navigasi halaman"
          className="mt-4 flex items-center justify-between gap-3"
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => gantiHalaman(page - 1)}
          >
            Sebelumnya
          </Button>

          <p className="text-sm text-slate-500">
            Halaman {pagination.page} dari {pagination.totalPages}
          </p>

          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => gantiHalaman(page + 1)}
          >
            Berikutnya
          </Button>
        </nav>
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
