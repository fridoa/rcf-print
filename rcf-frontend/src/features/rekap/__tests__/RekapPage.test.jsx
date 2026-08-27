import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { RekapPage } from "@/features/rekap";
import { renderWithProviders } from "@/test/renderWithProviders";
import { ROLES } from "@/shared/constants/roles";

vi.mock("@/features/auth/api/auth.api", () => ({
  authApi: {
    login: vi.fn(),
    me: vi.fn(),
    editProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}));

vi.mock("@/features/rekap/api/rekap.api", () => ({
  rekapApi: { harian: vi.fn() },
}));

const { authApi } = await import("@/features/auth/api/auth.api");
const { rekapApi } = await import("@/features/rekap/api/rekap.api");

const ADMIN = {
  _id: "u1",
  name: "Admin RCF",
  username: "admin",
  email: "admin@rcfprint.com",
  role: ROLES.ADMIN,
  isActive: true,
};

const HASIL = {
  rentang: { dari: "2026-09-01", sampai: "2026-09-03" },
  baris: [
    {
      tanggal: "2026-09-01",
      pelanggan: 2,
      file: 3,
      qty: 25,
      cash: 100000,
      transfer: 250000,
      jumlahOrder: 2,
    },
    {
      tanggal: "2026-09-02",
      pelanggan: 1,
      file: 3,
      qty: 8,
      cash: 75000,
      transfer: 0,
      jumlahOrder: 1,
    },
  ],
  total: {
    pelanggan: 2,
    file: 6,
    qty: 33,
    cash: 175000,
    transfer: 250000,
    pendapatan: 425000,
    jumlahOrder: 3,
  },
};

function RekapRoutes() {
  return (
    <Routes>
      <Route path="/rekap" element={<RekapPage />} />
    </Routes>
  );
}

async function renderAdmin() {
  localStorage.setItem("rcf.token", "tok-123");
  authApi.me.mockResolvedValue(ADMIN);
  const hasil = renderWithProviders(<RekapRoutes />, { routes: ["/rekap"] });
  // tunggu auth beres (nama admin muncul di suatu tempat tidak dijamin — cukup
  // tunggu tabel/heading render)
  await screen.findByText("Rekap Data");
  return hasil;
}

describe("RekapPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    rekapApi.harian.mockResolvedValue(HASIL);
  });

  it("menampilkan baris harian + baris TOTAL dengan format rupiah", async () => {
    await renderAdmin();

    // tunggu data render
    expect(await screen.findByText("Rp 425.000")).toBeInTheDocument();

    // baris TOTAL
    const totalRow = screen.getByText("TOTAL").closest("tr");
    expect(totalRow).toHaveTextContent("Rp 175.000"); // cash total
    expect(totalRow).toHaveTextContent("Rp 250.000"); // transfer total
    expect(totalRow).toHaveTextContent("Rp 425.000"); // pendapatan

    // total per baris pertama = cash + transfer = 350.000
    expect(screen.getByText("Rp 350.000")).toBeInTheDocument();
  });

  it("mengirim rentang default (bulan berjalan) saat pertama dibuka", async () => {
    await renderAdmin();

    await waitFor(() => expect(rekapApi.harian).toHaveBeenCalled());
    const arg = rekapApi.harian.mock.calls[0][0];
    // dari = tanggal 1, sampai = hari ini (format YYYY-MM-DD)
    expect(arg.dari).toMatch(/^\d{4}-\d{2}-01$/);
    expect(arg.sampai).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("mengirim rentang baru saat admin mengubah tanggal", async () => {
    await renderAdmin();
    await waitFor(() => expect(rekapApi.harian).toHaveBeenCalled());

    const dari = screen.getByLabelText(/^dari$/i);
    await userEvent.clear(dari);
    await userEvent.type(dari, "2026-09-01");

    await waitFor(() =>
      expect(rekapApi.harian).toHaveBeenCalledWith(
        expect.objectContaining({ dari: "2026-09-01" })
      )
    );
  });

  it("menampilkan peringatan dan tidak query saat rentang terbalik", async () => {
    await renderAdmin();
    await waitFor(() => expect(rekapApi.harian).toHaveBeenCalled());
    const jumlahAwal = rekapApi.harian.mock.calls.length;

    const dari = screen.getByLabelText(/^dari$/i);
    await userEvent.clear(dari);
    await userEvent.type(dari, "2026-12-31");

    expect(
      await screen.findByText(/tidak boleh sebelum/i)
    ).toBeInTheDocument();
    // tidak ada query baru dengan rentang terbalik
    expect(rekapApi.harian.mock.calls.length).toBe(jumlahAwal);
  });

  it("menampilkan keadaan kosong saat tidak ada data", async () => {
    rekapApi.harian.mockResolvedValue({
      rentang: {},
      baris: [],
      total: { pelanggan: 0, file: 0, qty: 0, cash: 0, transfer: 0, pendapatan: 0, jumlahOrder: 0 },
    });

    await renderAdmin();

    expect(
      await screen.findByText(/tidak ada order selesai/i)
    ).toBeInTheDocument();
  });
});
