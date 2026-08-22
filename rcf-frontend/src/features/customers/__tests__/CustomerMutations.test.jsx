import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { CustomerListPage } from "@/features/customers";
import { renderWithProviders } from "@/test/renderWithProviders";

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

const BUDI = {
  _id: "c1",
  name: "Budi Santoso",
  whatsapp: "6281234567890",
  note: "Langganan kaos komunitas",
};

const daftar = (items = [BUDI]) => ({
  items,
  pagination: { page: 1, limit: 20, total: items.length, totalPages: 1 },
});

function CustomerRoutes() {
  return (
    <Routes>
      <Route path="/pelanggan" element={<CustomerListPage />} />
    </Routes>
  );
}

async function renderAdmin() {
  localStorage.setItem("rcf.token", "tok-123");
  authApi.me.mockResolvedValue(USER_ADMIN);

  const hasil = renderWithProviders(<CustomerRoutes />, {
    routes: ["/pelanggan"],
  });

  await screen.findByText("Budi Santoso");
  return hasil;
}

/** Buka dialog tambah dan tunggu formnya muncul. */
async function bukaFormTambah() {
  await userEvent.click(
    screen.getByRole("button", { name: /tambah pelanggan/i })
  );
  await screen.findByLabelText(/nama pelanggan/i);
}

/** Buka dialog ubah untuk Budi. */
async function bukaFormUbah() {
  await userEvent.click(screen.getByRole("button", { name: /ubah budi santoso/i }));
  await screen.findByLabelText(/nama pelanggan/i);
}

describe("CustomerListPage — tambah pelanggan", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    customerApi.list.mockResolvedValue(daftar());
  });

  it("mengirim nomor apa adanya seperti yang diketik admin", async () => {
    customerApi.create.mockResolvedValue({
      _id: "c9",
      name: "Dewi Lestari",
      whatsapp: "6285711112222",
      note: "",
    });

    await renderAdmin();
    await bukaFormTambah();

    await userEvent.type(screen.getByLabelText(/nama pelanggan/i), "Dewi Lestari");
    await userEvent.type(
      screen.getByLabelText(/nomor whatsapp/i),
      "0857-1111-2222"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /simpan pelanggan/i })
    );

    // normalisasi ke 62xxx adalah tugas backend, FE tidak boleh menebaknya
    await waitFor(() =>
      expect(customerApi.create).toHaveBeenCalledWith({
        name: "Dewi Lestari",
        whatsapp: "0857-1111-2222",
        note: "",
      })
    );
  });

  it("menutup dialog dan memuat ulang daftar setelah sukses", async () => {
    customerApi.create.mockResolvedValue({ _id: "c9", name: "Dewi Lestari" });

    await renderAdmin();
    await bukaFormTambah();

    await userEvent.type(screen.getByLabelText(/nama pelanggan/i), "Dewi Lestari");
    await userEvent.type(screen.getByLabelText(/nomor whatsapp/i), "085711112222");
    await userEvent.click(
      screen.getByRole("button", { name: /simpan pelanggan/i })
    );

    await waitFor(() =>
      expect(screen.queryByLabelText(/nama pelanggan/i)).not.toBeInTheDocument()
    );
    // list dipanggil ulang karena cache di-invalidate
    expect(customerApi.list.mock.calls.length).toBeGreaterThan(1);
  });

  it("menolak nomor tidak valid tanpa memanggil API", async () => {
    await renderAdmin();
    await bukaFormTambah();

    await userEvent.type(screen.getByLabelText(/nama pelanggan/i), "Dewi Lestari");
    await userEvent.type(screen.getByLabelText(/nomor whatsapp/i), "12345");
    await userEvent.click(
      screen.getByRole("button", { name: /simpan pelanggan/i })
    );

    expect(
      await screen.findByText(/nomor whatsapp tidak valid/i)
    ).toBeInTheDocument();
    expect(customerApi.create).not.toHaveBeenCalled();
  });

  it("menolak nama kurang dari 3 karakter tanpa memanggil API", async () => {
    await renderAdmin();
    await bukaFormTambah();

    await userEvent.type(screen.getByLabelText(/nama pelanggan/i), "Bu");
    await userEvent.type(screen.getByLabelText(/nomor whatsapp/i), "085711112222");
    await userEvent.click(
      screen.getByRole("button", { name: /simpan pelanggan/i })
    );

    expect(
      await screen.findByText(/nama pelanggan minimal 3 karakter/i)
    ).toBeInTheDocument();
    expect(customerApi.create).not.toHaveBeenCalled();
  });

  it("menampilkan pesan 409 dari server dan dialog tetap terbuka", async () => {
    customerApi.create.mockRejectedValue({
      status: 409,
      message: "Nomor WhatsApp sudah terdaftar atas nama Budi Santoso",
      errors: [],
    });

    await renderAdmin();
    await bukaFormTambah();

    await userEvent.type(screen.getByLabelText(/nama pelanggan/i), "Budi Kedua");
    await userEvent.type(screen.getByLabelText(/nomor whatsapp/i), "081234567890");
    await userEvent.click(
      screen.getByRole("button", { name: /simpan pelanggan/i })
    );

    expect(
      await screen.findByText(
        "Nomor WhatsApp sudah terdaftar atas nama Budi Santoso"
      )
    ).toBeInTheDocument();
    // isian tidak hilang supaya admin bisa memperbaiki nomornya
    expect(screen.getByLabelText(/nama pelanggan/i)).toHaveValue("Budi Kedua");
  });
});

describe("CustomerListPage — ubah pelanggan", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    customerApi.list.mockResolvedValue(daftar());
  });

  it("mengisi form dengan data baris yang dipilih", async () => {
    await renderAdmin();
    await bukaFormUbah();

    expect(screen.getByLabelText(/nama pelanggan/i)).toHaveValue("Budi Santoso");
    expect(screen.getByLabelText(/nomor whatsapp/i)).toHaveValue("6281234567890");
  });

  it("hanya mengirim field yang diubah, beserta id", async () => {
    customerApi.update.mockResolvedValue({ ...BUDI, name: "Budi Santoso Jaya" });

    await renderAdmin();
    await bukaFormUbah();

    const inputNama = screen.getByLabelText(/nama pelanggan/i);
    await userEvent.clear(inputNama);
    await userEvent.type(inputNama, "Budi Santoso Jaya");
    await userEvent.click(
      screen.getByRole("button", { name: /simpan perubahan/i })
    );

    await waitFor(() =>
      expect(customerApi.update).toHaveBeenCalledWith({
        id: "c1",
        name: "Budi Santoso Jaya",
      })
    );
  });

  it("tombol simpan mati sebelum ada perubahan", async () => {
    await renderAdmin();
    await bukaFormUbah();

    expect(
      screen.getByRole("button", { name: /simpan perubahan/i })
    ).toBeDisabled();
    expect(customerApi.update).not.toHaveBeenCalled();
  });

  it("menutup dialog tanpa mengirim apa pun saat Batal diklik", async () => {
    await renderAdmin();
    await bukaFormUbah();

    await userEvent.click(screen.getByRole("button", { name: /^batal$/i }));

    await waitFor(() =>
      expect(screen.queryByLabelText(/nama pelanggan/i)).not.toBeInTheDocument()
    );
    expect(customerApi.update).not.toHaveBeenCalled();
  });
});

describe("CustomerListPage — hapus pelanggan", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    customerApi.list.mockResolvedValue(daftar());
  });

  const bukaKonfirmasiHapus = async () => {
    await userEvent.click(
      screen.getByRole("button", { name: /hapus budi santoso/i })
    );
    await screen.findByText(/tindakan ini tidak bisa dibatalkan/i);
  };

  it("menyebut nama pelanggan di konfirmasi", async () => {
    await renderAdmin();
    await bukaKonfirmasiHapus();

    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
  });

  it("menghapus setelah dikonfirmasi lalu memuat ulang daftar", async () => {
    customerApi.remove.mockResolvedValue("Pelanggan berhasil dihapus");

    await renderAdmin();
    await bukaKonfirmasiHapus();

    await userEvent.click(screen.getByRole("button", { name: /^hapus$/i }));

    await waitFor(() => expect(customerApi.remove).toHaveBeenCalledWith("c1"));
    expect(customerApi.list.mock.calls.length).toBeGreaterThan(1);
  });

  it("tidak menghapus apa pun kalau dibatalkan", async () => {
    await renderAdmin();
    await bukaKonfirmasiHapus();

    await userEvent.click(screen.getByRole("button", { name: /^batal$/i }));

    await waitFor(() =>
      expect(
        screen.queryByText(/tindakan ini tidak bisa dibatalkan/i)
      ).not.toBeInTheDocument()
    );
    expect(customerApi.remove).not.toHaveBeenCalled();
  });

  it("menampilkan pesan 409 saat pelanggan masih punya order", async () => {
    customerApi.remove.mockRejectedValue({
      status: 409,
      message: "Pelanggan tidak bisa dihapus karena sudah punya 3 order",
      errors: [],
    });

    await renderAdmin();
    await bukaKonfirmasiHapus();

    await userEvent.click(screen.getByRole("button", { name: /^hapus$/i }));

    expect(
      await screen.findByText(
        "Pelanggan tidak bisa dihapus karena sudah punya 3 order"
      )
    ).toBeInTheDocument();
    // dialog tetap terbuka supaya pesannya terbaca
    expect(
      screen.getByText(/tindakan ini tidak bisa dibatalkan/i)
    ).toBeInTheDocument();
  });
});
