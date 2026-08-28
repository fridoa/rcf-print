import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DesainPage } from "@/features/orders";
import { renderWithProviders } from "@/test/renderWithProviders";
import { ROLES } from "@/shared/constants/roles";

/**
 * DesainPage — dulu hardcode limit:50 tanpa pagination (order ke-51+
 * tidak terlihat). Sekarang mengikuti pola WorkQueuePage: desktop =
 * Pagination + selector limit, HP = infinite scroll.
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
  },
}));

// Desktop = Pagination + selector limit; inilah cabang yang dulu tidak ada.
vi.mock("@/shared/hooks/useMediaQuery", () => ({
  useIsDesktop: vi.fn(() => true),
}));

const { authApi } = await import("@/features/auth/api/auth.api");
const { orderApi } = await import("@/features/orders/api/order.api");
const { useIsDesktop } = await import("@/shared/hooks/useMediaQuery");

const DESIGNER = { _id: "u5", name: "Des", role: ROLES.DESIGNER ?? "DESIGNER" };

const order = (n) => ({
  _id: `o${n}`,
  kode_order: `DTF/220826/00${n}`,
  jenis: "DTF",
  customer_id: { _id: "c1", name: "Budi", whatsapp: "6281234567890" },
  status: "ANTRI_DESAIN",
  total_qty: 10,
  file_count: 2,
});

const daftar = (items, pagination) => ({
  items,
  pagination:
    pagination ??
    { page: 1, limit: 10, total: items.length, totalPages: 1 },
});

async function renderPage() {
  localStorage.setItem("rcf.token", "tok-123");
  authApi.me.mockResolvedValue(DESIGNER);
  const hasil = renderWithProviders(<DesainPage />, { routes: ["/desain"] });
  await screen.findByText("DTF/220826/001");
  return hasil;
}

describe("DesainPage — paginasi & limit", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    // resetAllMocks mematikan implementasi mock -> pasang lagi tiap test.
    useIsDesktop.mockReturnValue(true);
    orderApi.list.mockResolvedValue(daftar([order(1)]));
  });

  it("multi halaman: pagination + selector limit tampil di desktop", async () => {
    orderApi.list.mockResolvedValue(
      daftar([order(1)], { page: 1, limit: 10, total: 24, totalPages: 3 })
    );

    await renderPage();

    expect(
      screen.getByRole("navigation", { name: /navigasi halaman/i })
    ).toBeInTheDocument();
  });

  it("meminta limit 10 + filter status ANTRI_DESAIN", async () => {
    await renderPage();

    await waitFor(() => {
      expect(orderApi.list).toHaveBeenCalled();
      const arg = orderApi.list.mock.calls[0][0];
      expect(arg).toMatchObject({ limit: 10, status: "ANTRI_DESAIN" });
    });
  });

  it("pindah halaman memanggil API dengan page baru", async () => {
    orderApi.list.mockResolvedValue(
      daftar([order(1)], { page: 1, limit: 10, total: 24, totalPages: 3 })
    );
    await renderPage();

    orderApi.list.mockResolvedValue(
      daftar([order(2)], { page: 2, limit: 10, total: 24, totalPages: 3 })
    );
    // Pagination project ini hanya punya Sebelumnya/Berikutnya (tanpa
    // tombol nomor), jadi pindah halaman = klik "Berikutnya".
    await userEvent.click(
      screen.getByRole("button", { name: /berikutnya/i })
    );

    await waitFor(() => {
      const terakhir = orderApi.list.mock.calls.at(-1)[0];
      expect(terakhir).toMatchObject({ page: 2 });
    });
  });

  it("mencari order mengembalikan ke halaman 1", async () => {
    orderApi.list.mockResolvedValue(
      daftar([order(1)], { page: 2, limit: 10, total: 24, totalPages: 3 })
    );

    localStorage.setItem("rcf.token", "tok-123");
    authApi.me.mockResolvedValue(DESIGNER);
    renderWithProviders(<DesainPage />, { routes: ["/desain"] });
    await screen.findByText("DTF/220826/001");

    orderApi.list.mockResolvedValue(daftar([order(1)]));
    await userEvent.type(screen.getByLabelText(/cari order/i), "DTF/220826");

    await waitFor(() => {
      const terakhir = orderApi.list.mock.calls.at(-1)[0];
      expect(terakhir).toMatchObject({ page: 1, search: "DTF/220826" });
    });
  });
});
