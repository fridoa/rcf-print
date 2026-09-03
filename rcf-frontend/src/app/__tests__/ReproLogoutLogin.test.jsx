import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/features/auth";
import { queryClient } from "@/app/queryClient";
import { AppRouter } from "@/app/router";

/**
 * REPRO SEMENTARA (akan dihapus): designer buka /desain, logout, lalu
 * produksi login -> apakah produksi terdampar di /desain?
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
    list: vi.fn(),
    detail: vi.fn(),
    riwayat: vi.fn(),
    create: vi.fn(),
    majukanStatus: vi.fn(),
    selesaikan: vi.fn(),
    koreksi: vi.fn(),
    statistik: vi.fn(),
    tertahan: vi.fn(),
  },
}));

const { authApi } = await import("@/features/auth/api/auth.api");
const { orderApi } = await import("@/features/orders/api/order.api");

const DESIGNER = { _id: "u5", name: "Desi", role: "DESIGNER" };
const PRODUKSI = { _id: "u9", name: "Prod", role: "PRODUKSI" };

const ORDER_DESAIN = {
  _id: "o1",
  kode_order: "DTF/010926/001",
  jenis: "DTF",
  customer_id: { _id: "c1", name: "Budi", whatsapp: "6281234567890" },
  status: "ANTRI_DESAIN",
  total_qty: 10,
  file_count: 2,
};

describe("REPRO: sisa halaman role sebelumnya setelah logout", () => {
  beforeEach(() => {
    localStorage.clear();
    queryClient.clear();
    vi.resetAllMocks();
    orderApi.list.mockResolvedValue({
      items: [ORDER_DESAIN],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    orderApi.statistik.mockResolvedValue({
      perStatus: {},
      perStatusJenis: {},
      hariIni: { orderBaru: 0, selesai: 0, pendapatan: 0 },
    });
    orderApi.tertahan.mockResolvedValue({
      ambang_hari: 3,
      total: 0,
      per_status: {},
      items: [],
    });
  });

  it("produksi yang login setelah designer logout TIDAK boleh mendarat di /desain", async () => {
    // 1. designer sudah login dan sedang di /desain
    localStorage.setItem("rcf.token", "tok-designer");
    authApi.me.mockResolvedValue(DESIGNER);

    render(
      <MemoryRouter initialEntries={["/desain"]}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText("DTF/010926/001")).toBeInTheDocument();

    // 2. logout lewat tombol + konfirmasi
    await userEvent.click(
      screen.getAllByRole("button", { name: /^keluar$/i })[0]
    );
    const tombol = screen.getAllByRole("button", { name: /^keluar$/i });
    await userEvent.click(tombol[tombol.length - 1]);

    await screen.findByRole("button", { name: /masuk/i });

    // 3. produksi login dari form yang sama
    authApi.login.mockResolvedValue({ token: "tok-prod", user: PRODUKSI });
    authApi.me.mockResolvedValue(PRODUKSI);

    await userEvent.type(
      screen.getByLabelText(/username atau email/i),
      "produksi"
    );
    await userEvent.type(screen.getByLabelText(/^password$/i), "rahasia123");
    await userEvent.click(screen.getByRole("button", { name: /masuk/i }));

    // 4. harus mendarat di dashboard produksi, BUKAN antrian desain
    await waitFor(() =>
      expect(screen.queryByText("Antrian Desain")).not.toBeInTheDocument()
    );
  });
});
