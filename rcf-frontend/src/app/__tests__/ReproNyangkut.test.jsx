import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/features/auth";
import { queryClient } from "@/app/queryClient";
import { AppRouter } from "@/app/router";

/**
 * REPRO SEMENTARA #2 (akan dihapus).
 *
 * Dua jalur yang dicurigai:
 *  A. Sesi kedaluwarsa (401) di /desain -> RequireAuth menyimpan state.from
 *     = "/desain" -> user BERIKUTNYA yang login (role apa pun) dilempar ke
 *     /desain, bukan ke dashboard rolenya.
 *  B. Produksi mengetik/membuka /desain langsung: tidak ada RequireRole di
 *     route antrian, jadi halaman terbuka penuh.
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

const ORDER_DESAIN = {
  _id: "o1",
  kode_order: "DTF/010926/001",
  jenis: "DTF",
  customer_id: { _id: "c1", name: "Budi", whatsapp: "6281234567890" },
  status: "ANTRI_DESAIN",
  total_qty: 10,
  file_count: 2,
};

function renderApp(entries) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("REPRO jalur nyangkut", () => {
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

  it("A. sesi habis di /desain, lalu PRODUKSI login -> mendarat di mana?", async () => {
    // token designer sudah kedaluwarsa: /auth/me gagal 401
    localStorage.setItem("rcf.token", "tok-kedaluwarsa");
    authApi.me.mockRejectedValue({ status: 401, message: "Token tidak valid" });

    renderApp(["/desain"]);

    await screen.findByRole("button", { name: /masuk/i });

    authApi.login.mockResolvedValue({ token: "tok-prod", user: PRODUKSI });
    authApi.me.mockResolvedValue(PRODUKSI);

    await userEvent.type(
      screen.getByLabelText(/username atau email/i),
      "produksi"
    );
    await userEvent.type(screen.getByLabelText(/^password$/i), "rahasia123");
    await userEvent.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /masuk/i })).toBeNull();
    });

    const diDesain = Boolean(screen.queryByText("Antrian Desain"));
    console.log(
      `[REPRO-A] setelah login PRODUKSI, di halaman Antrian Desain? ${diDesain}`
    );
    expect(diDesain).toBe(false);
  });

  it("B. PRODUKSI membuka /desain langsung -> terbuka?", async () => {
    localStorage.setItem("rcf.token", "tok-prod");
    authApi.me.mockResolvedValue(PRODUKSI);

    renderApp(["/desain"]);

    const judul = await screen
      .findByText("Antrian Desain", {}, { timeout: 3000 })
      .catch(() => null);

    console.log(
      `[REPRO-B] PRODUKSI bisa membuka /desain? ${Boolean(judul)}`
    );
    expect(judul).toBeNull();
  });
});
