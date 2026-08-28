import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
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

  // Helper: buka popover kalender dan klik satu tanggal. day-picker v10
  // memberi tiap sel data-day="YYYY-MM-DD" — jauh lebih deterministik
  // daripada nama aksesibel (yang hanya berupa angka tanggal).
  const klikTanggal = async (dataDay) => {
    if (!screen.queryByRole("dialog", { name: /rentang tanggal/i })) {
      await userEvent.click(
        screen.getByRole("button", { name: /pilih rentang|–/ })
      );
    }
    const sel = document.querySelector(`[data-day="${dataDay}"] button`);
    if (!sel) {
      throw new Error(`tanggal ${dataDay} tidak ada di kalender (mungkin bulan lain — navigasi dulu)`);
    }
    await userEvent.click(sel);
  };

  it("mengirim rentang baru saat admin memilih lewat kalender", async () => {
    await renderAdmin();
    await waitFor(() => expect(rekapApi.harian).toHaveBeenCalled());

    // day-picker "smart range": klik di dalam rentang menggeser ujung
    // terdekat. Default 1-28 Agu; klik 5 Agu -> {1..5}, klik 25 -> {1..25}.
    await klikTanggal("2026-08-05");
    await klikTanggal("2026-08-25");

    await waitFor(() => {
      const terakhir = rekapApi.harian.mock.calls.at(-1)[0];
      expect(terakhir).toMatchObject({ dari: "2026-08-01", sampai: "2026-08-25" });
    });
  }, 15000);

  it("kalender range tidak bisa menghasilkan rentang terbalik", async () => {
    await renderAdmin();
    await waitFor(() => expect(rekapApi.harian).toHaveBeenCalled());
    const jumlahAwal = rekapApi.harian.mock.calls.length;

    // Apapun urutan klik, from selalu <= to (smart range menggeser ujung
    // terdekat, tidak pernah menghasilkan from > to).
    await klikTanggal("2026-08-25");
    await klikTanggal("2026-08-05");

    for (const call of rekapApi.harian.mock.calls) {
      expect(call[0].dari <= call[0].sampai).toBe(true);
    }
  }, 15000);

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
