import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CetakPage, PackingPage } from "@/features/orders";
import { renderWithProviders } from "@/test/renderWithProviders";
import { ROLES } from "@/shared/constants/roles";

/**
 * WorkQueuePage (via CetakPage) — fokus: aksi maju status TIDAK langsung jalan,
 * harus lewat ConfirmDialog dulu untuk antisipasi tombol kepencet.
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

const { authApi } = await import("@/features/auth/api/auth.api");
const { orderApi } = await import("@/features/orders/api/order.api");

const PRODUKSI = {
  _id: "u9",
  name: "Prod",
  role: ROLES.PRODUKSI ?? "PRODUKSI",
};

const ORDER = {
  _id: "o1",
  kode_order: "DTF/220826/001",
  jenis: "DTF",
  customer_id: { _id: "c1", name: "Budi", whatsapp: "6281234567890" },
  status: "ANTRI_CETAK",
  total_qty: 24,
  file_count: 3,
};

const daftar = (items) => ({
  items,
  pagination: { page: 1, limit: 50, total: items.length, totalPages: 1 },
});

async function renderPage() {
  localStorage.setItem("rcf.token", "tok-123");
  authApi.me.mockResolvedValue(PRODUKSI);
  const hasil = renderWithProviders(<CetakPage />, { routes: ["/cetak"] });
  await screen.findByText("DTF/220826/001");
  return hasil;
}

describe("WorkQueuePage — konfirmasi maju status", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    orderApi.list.mockResolvedValue(daftar([ORDER]));
  });

  it("tidak langsung memanggil API saat tombol aksi ditekan", async () => {
    await renderPage();

    await userEvent.click(
      screen.getByRole("button", { name: /selesai cetak/i })
    );

    // dialog konfirmasi muncul; API belum dipanggil
    expect(
      await screen.findByText(/majukan order dtf\/220826\/001/i)
    ).toBeInTheDocument();
    expect(orderApi.majukanStatus).not.toHaveBeenCalled();
  });

  it("memajukan status hanya setelah konfirmasi ditekan", async () => {
    orderApi.majukanStatus.mockResolvedValue({ ...ORDER, status: "PACKING" });

    await renderPage();

    await userEvent.click(
      screen.getByRole("button", { name: /selesai cetak/i })
    );
    await screen.findByText(/majukan order/i);

    // tombol konfirmasi di dalam dialog (label sama dengan aksi)
    const tombolDialog = screen.getAllByRole("button", {
      name: /selesai cetak/i,
    });
    // yang terakhir = tombol di dalam dialog
    await userEvent.click(tombolDialog[tombolDialog.length - 1]);

    await waitFor(() =>
      expect(orderApi.majukanStatus).toHaveBeenCalledWith({ id: "o1" })
    );
  });

  it("batal menutup dialog tanpa memanggil API", async () => {
    await renderPage();

    await userEvent.click(
      screen.getByRole("button", { name: /selesai cetak/i })
    );
    await screen.findByText(/majukan order/i);

    await userEvent.click(screen.getByRole("button", { name: /^batal$/i }));

    await waitFor(() =>
      expect(screen.queryByText(/majukan order/i)).not.toBeInTheDocument()
    );
    expect(orderApi.majukanStatus).not.toHaveBeenCalled();
  });

  it("menampilkan dialog notifikasi WhatsApp saat order di antrian packing ditandai siap", async () => {
    const ORDER_PACKING = {
      ...ORDER,
      _id: "o-pack-1",
      kode_order: "DTF/220826/002",
      status: "PACKING",
    };

    localStorage.setItem("rcf.token", "tok-123");
    authApi.me.mockResolvedValue({
      _id: "u10",
      name: "Packer",
      role: ROLES.PACKING ?? "PACKING",
    });
    orderApi.list.mockResolvedValue(daftar([ORDER_PACKING]));
    orderApi.majukanStatus.mockResolvedValue({
      ...ORDER_PACKING,
      status: "READY",
    });

    renderWithProviders(<PackingPage />, { routes: ["/packing"] });
    await screen.findByText("DTF/220826/002");

    // Klik tombol Tandai Siap di tabel
    await userEvent.click(
      screen.getByRole("button", { name: /tandai siap/i })
    );

    // Konfirmasi di dialog
    const tombolKonfirmasi = screen.getAllByRole("button", {
      name: /tandai siap/i,
    });
    await userEvent.click(tombolKonfirmasi[tombolKonfirmasi.length - 1]);

    // Dialog WhatsApp muncul
    expect(
      await screen.findByText(/order siap diambil!/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /kirim pesan whatsapp/i })
    ).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/6281234567890")
    );
  });
});

