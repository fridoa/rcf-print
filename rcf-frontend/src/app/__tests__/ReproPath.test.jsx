import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/features/auth";
import { queryClient } from "@/app/queryClient";
import { AppRouter } from "@/app/router";

/**
 * REPRO SEMENTARA #3 (akan dihapus) — cetak pathname aktif supaya jelas
 * ke mana user mendarat, bukan hanya "judul ada/tidak".
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

const PRODUKSI = { _id: "u9", name: "Prod", role: "PRODUKSI" };

function Probe() {
  const { pathname } = useLocation();
  return <span data-testid="path">{pathname}</span>;
}

function renderApp(entries) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Probe />
          <AppRouter />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("REPRO pathname", () => {
  beforeEach(() => {
    localStorage.clear();
    queryClient.clear();
    vi.resetAllMocks();
    orderApi.list.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
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

  it("sesi habis di /desain lalu PRODUKSI login", async () => {
    localStorage.setItem("rcf.token", "tok-basi");
    authApi.me.mockRejectedValue({ status: 401, message: "Token tidak valid" });

    renderApp(["/desain"]);

    await screen.findByRole("button", { name: /masuk/i });
    console.log(
      `[REPRO] pathname saat form login = ${screen.getByTestId("path").textContent}`
    );

    authApi.login.mockResolvedValue({ token: "tok-prod", user: PRODUKSI });
    authApi.me.mockResolvedValue(PRODUKSI);

    await userEvent.type(
      screen.getByLabelText(/username atau email/i),
      "produksi"
    );
    await userEvent.type(screen.getByLabelText(/^password$/i), "rahasia123");
    await userEvent.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /masuk/i })).toBeNull()
    );

    // Assertion sengaja dibuat gagal supaya pesan diff MENCETAK pathname
    // aslinya (console.log dari test yang lolos tidak ditampilkan vitest).
    expect(screen.getByTestId("path").textContent).toBe("TAMPILKAN_PATH_ASLI");
  });
});
