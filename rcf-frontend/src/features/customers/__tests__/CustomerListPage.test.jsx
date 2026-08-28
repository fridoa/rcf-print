import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { CustomerListPage } from "@/features/customers";
import { renderWithProviders } from "@/test/renderWithProviders";

// Dua modul api dimock: auth (untuk restore sesi) dan customers.
vi.mock("@/features/auth/api/auth.api", () => ({
  authApi: {
    login: vi.fn(),
    me: vi.fn(),
    editProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}));

vi.mock("@/features/customers/api/customer.api", () => ({
  customerApi: {
    list: vi.fn(),
    detail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const { authApi } = await import("@/features/auth/api/auth.api");
const { customerApi } = await import("@/features/customers/api/customer.api");

const USER_ADMIN = {
  _id: "u1",
  name: "Admin RCF",
  username: "admin",
  email: "admin@rcfprint.com",
  role: "ADMIN",
  isActive: true,
};

const USER_DESIGNER = { ...USER_ADMIN, _id: "u2", name: "Desainer", role: "DESIGNER" };

const BUDI = {
  _id: "c1",
  name: "Budi Santoso",
  whatsapp: "6281234567890",
  note: "Langganan kaos komunitas",
};

const CITRA = {
  _id: "c2",
  name: "Citra Dewi",
  whatsapp: "6281298765432",
  note: "",
};

const halamanSatu = (items = [BUDI, CITRA], override = {}) => ({
  items,
  pagination: {
    page: 1,
    limit: 20,
    total: items.length,
    totalPages: 1,
    ...override,
  },
});

function CustomerRoutes() {
  return (
    <Routes>
      <Route path="/pelanggan" element={<CustomerListPage />} />
    </Routes>
  );
}

/** Render dengan sesi aktif dan tunggu tabel terisi. */
async function renderSebagai(user = USER_ADMIN) {
  localStorage.setItem("rcf.token", "tok-123");
  authApi.me.mockResolvedValue(user);

  const hasil = renderWithProviders(<CustomerRoutes />, {
    routes: ["/pelanggan"],
  });

  await screen.findByText("Budi Santoso");
  return hasil;
}

describe("CustomerListPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    customerApi.list.mockResolvedValue(halamanSatu());
  });

  it("menampilkan daftar pelanggan dengan nomor dalam format lokal", async () => {
    await renderSebagai();

    expect(screen.getByText("0812-3456-7890")).toBeInTheDocument();
    expect(screen.getByText("Citra Dewi")).toBeInTheDocument();
    expect(screen.getByText(/2 pelanggan terdaftar/i)).toBeInTheDocument();
  });

  it("menautkan nomor ke wa.me dengan format 62", async () => {
    await renderSebagai();

    const link = screen.getByRole("link", { name: "0812-3456-7890" });
    expect(link).toHaveAttribute("href", "https://wa.me/6281234567890");
  });

  it("menampilkan tanda hubung untuk catatan yang kosong", async () => {
    await renderSebagai();

    const barisCitra = screen.getByText("Citra Dewi").closest("tr");
    expect(within(barisCitra).getByText("-")).toBeInTheDocument();
  });

  it("mencari dengan debounce: satu request untuk satu rentetan ketikan", async () => {
    await renderSebagai();
    customerApi.list.mockResolvedValue(halamanSatu([CITRA]));

    await userEvent.type(screen.getByLabelText(/cari pelanggan/i), "citra");

    await waitFor(() =>
      expect(customerApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "citra", page: 1 })
      )
    );

    // panggilan pertama (search kosong) + satu panggilan hasil debounce
    expect(customerApi.list.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("menampilkan pesan kosong kalau pencarian tidak menemukan apa pun", async () => {
    await renderSebagai();
    customerApi.list.mockResolvedValue(halamanSatu([]));

    await userEvent.type(screen.getByLabelText(/cari pelanggan/i), "zzz");

    expect(
      await screen.findByText(/belum ada pelanggan yang cocok/i)
    ).toBeInTheDocument();
  });

  it("menampilkan navigasi halaman saat data lebih dari satu halaman", async () => {
    customerApi.list.mockResolvedValue(
      halamanSatu([BUDI, CITRA], { total: 30, totalPages: 2 })
    );

    await renderSebagai();

    expect(screen.getByText(/halaman 1 dari 2/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sebelumnya/i })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /berikutnya/i }));

    await waitFor(() =>
      expect(customerApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 })
      )
    );
  });

  it("menyembunyikan tombol kelola untuk role non-admin", async () => {
    await renderSebagai(USER_DESIGNER);

    expect(
      screen.queryByRole("button", { name: /tambah pelanggan/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /ubah budi santoso/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /hapus budi santoso/i })
    ).not.toBeInTheDocument();
  });

  it("menampilkan pesan error dari server saat daftar gagal dimuat", async () => {
    customerApi.list.mockRejectedValue({
      status: 500,
      message: "Terjadi kesalahan pada server",
      errors: [],
    });

    localStorage.setItem("rcf.token", "tok-123");
    authApi.me.mockResolvedValue(USER_ADMIN);
    renderWithProviders(<CustomerRoutes />, { routes: ["/pelanggan"] });

    expect(
      await screen.findByText("Terjadi kesalahan pada server")
    ).toBeInTheDocument();
  });
});
