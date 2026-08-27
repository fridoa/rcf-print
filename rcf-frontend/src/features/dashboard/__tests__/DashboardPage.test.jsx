import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { DashboardPage } from "@/features/dashboard";
import { renderWithProviders } from "@/test/renderWithProviders";
import { ROLES } from "@/shared/constants/roles";

/**
 * Test dispatcher DashboardPage: role menentukan dashboard yang tampil, dan
 * angka statistik dari API muncul. auth.api.me mengisi user login;
 * order.api.statistik menyediakan data ringkasan.
 */

vi.mock("@/features/auth/api/auth.api", () => ({
  authApi: {
    login: vi.fn(),
    me: vi.fn(),
    editProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}));

vi.mock("@/features/orders/api/order.api", () => ({
  orderApi: {
    statistik: vi.fn(),
    list: vi.fn(),
    detail: vi.fn(),
    riwayat: vi.fn(),
    create: vi.fn(),
    majukanStatus: vi.fn(),
    selesaikan: vi.fn(),
    koreksi: vi.fn(),
  },
}));

const { authApi } = await import("@/features/auth/api/auth.api");
const { orderApi } = await import("@/features/orders/api/order.api");

const STATISTIK = {
  perStatus: {
    ANTRI_DESAIN: { count: 4, qty: 40 },
    ANTRI_CETAK: { count: 2, qty: 20 },
    ANTRI_CUTTING: { count: 1, qty: 10 },
    PACKING: { count: 3, qty: 30 },
    READY: { count: 5, qty: 50 },
    SELESAI: { count: 9, qty: 90 },
  },
  perStatusJenis: {},
  aktifTotal: 15,
  overdue: 2,
  hariIni: { orderBaru: 6, selesai: 3, pendapatan: 450000 },
};

async function renderAs(role) {
  localStorage.setItem("rcf.token", "tok-123");
  authApi.me.mockResolvedValue({
    _id: "u1",
    name: "Pegawai RCF",
    username: "user",
    email: "user@rcfprint.com",
    role,
    isActive: true,
  });
  orderApi.statistik.mockResolvedValue(STATISTIK);

  return renderWithProviders(<DashboardPage />, { routes: ["/"] });
}

describe("DashboardPage per role", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it("ADMIN melihat pendapatan hari ini + order aktif + overdue", async () => {
    await renderAs(ROLES.ADMIN);

    // Kartu khas admin.
    expect(await screen.findByText("Pendapatan hari ini")).toBeInTheDocument();
    expect(screen.getByText("Rp 450.000")).toBeInTheDocument();
    expect(screen.getByText("Lewat deadline")).toBeInTheDocument();
    // aktifTotal muncul di kartu + center donut.
    expect(screen.getAllByText("15").length).toBeGreaterThan(0);
  });

  it("DESIGNER melihat kartu antrian desain", async () => {
    await renderAs(ROLES.DESIGNER);

    expect(await screen.findByText("Ringkasan desain hari ini.")).toBeInTheDocument();
    expect(screen.getByText("Antri Desain")).toBeInTheDocument();
    // Tidak menampilkan kartu pendapatan admin.
    expect(screen.queryByText("Pendapatan hari ini")).not.toBeInTheDocument();
  });

  it("PACKING melihat kartu packing + siap diambil", async () => {
    await renderAs(ROLES.PACKING);

    expect(await screen.findByText("Ringkasan packing hari ini.")).toBeInTheDocument();
    expect(screen.getByText("Packing")).toBeInTheDocument();
    expect(screen.getByText("Siap Diambil")).toBeInTheDocument();
  });
});
