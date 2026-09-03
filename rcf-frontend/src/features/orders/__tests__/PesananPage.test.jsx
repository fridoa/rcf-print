import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { PesananPage } from "@/features/orders";
import { renderWithProviders } from "@/test/renderWithProviders";
import { ROLES } from "@/shared/constants/roles";

/**
 * Test alur PesananPage (layar admin) end-to-end dengan API di-mock.
 * Pola sama dengan CustomerMutations.test.jsx:
 * - auth.api.me dipakai AuthProvider untuk mengisi user login
 * - order.api untuk data tabel & mutasi
 * - customer.api dimock juga karena OrderForm memakai CustomerPicker →
 *   useCustomers.
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
    update: vi.fn(),
    remove: vi.fn(),
    majukanStatus: vi.fn(),
    selesaikan: vi.fn(),
    koreksi: vi.fn(),
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
const { orderApi } = await import("@/features/orders/api/order.api");
const { customerApi } = await import("@/features/customers/api/customer.api");

const ADMIN = {
  _id: "u1",
  name: "Admin RCF",
  username: "admin",
  email: "admin@rcfprint.com",
  role: ROLES.ADMIN,
  isActive: true,
};

const BUDI = { _id: "c1", name: "Budi Santoso", whatsapp: "6281234567890" };

const ORDER_READY = {
  _id: "o1",
  kode_order: "DTF/220826/001",
  jenis: "DTF",
  customer_id: BUDI,
  status: "READY",
  total_qty: 24,
  file_count: 3,
  total_harga: null,
  metode_bayar: null,
  tgl_order: "2026-08-22T00:00:00+07:00",
};

const ORDER_ANTRI = {
  ...ORDER_READY,
  _id: "o2",
  kode_order: "DTF/220826/002",
  status: "ANTRI_DESAIN",
  total_qty: null,
  file_count: null,
};

const daftar = (items, meta = {}) => ({
  items,
  pagination: { page: 1, limit: 20, total: items.length, totalPages: 1 },
  meta: { aktif_di_luar_rentang: 0, ...meta },
});

function PesananRoutes() {
  return (
    <Routes>
      <Route path="/pesanan" element={<PesananPage />} />
    </Routes>
  );
}

async function renderAdmin() {
  localStorage.setItem("rcf.token", "tok-123");
  authApi.me.mockResolvedValue(ADMIN);

  const hasil = renderWithProviders(<PesananRoutes />, { routes: ["/pesanan"] });
  await screen.findByText("DTF/220826/001");
  return hasil;
}

describe("PesananPage — menyelesaikan order READY", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    orderApi.list.mockResolvedValue(daftar([ORDER_READY, ORDER_ANTRI]));
    customerApi.list.mockResolvedValue(daftar([BUDI]));
  });

  it("menampilkan tombol Selesaikan hanya untuk order READY", async () => {
    await renderAdmin();

    const tombol = screen.getAllByRole("button", { name: /selesaikan/i });
    // hanya satu order READY -> satu tombol Selesaikan
    expect(tombol).toHaveLength(1);
  });

  it("mengirim id + harga + metode saat menyelesaikan", async () => {
    orderApi.selesaikan.mockResolvedValue({ ...ORDER_READY, status: "SELESAI" });

    await renderAdmin();

    await userEvent.click(screen.getByRole("button", { name: /selesaikan/i }));
    await screen.findByLabelText(/total harga/i);

    await userEvent.type(screen.getByLabelText(/total harga/i), "350000");
    await userEvent.selectOptions(
      screen.getByLabelText(/metode bayar/i),
      "CASH"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /selesaikan order/i })
    );

    await waitFor(() =>
      expect(orderApi.selesaikan).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "o1",
          total_harga: 350000,
          metode_bayar: "CASH",
        })
      )
    );
  });

  it("menutup dialog dan memuat ulang daftar setelah sukses", async () => {
    orderApi.selesaikan.mockResolvedValue({ ...ORDER_READY, status: "SELESAI" });

    await renderAdmin();

    await userEvent.click(screen.getByRole("button", { name: /selesaikan/i }));
    await screen.findByLabelText(/total harga/i);
    await userEvent.type(screen.getByLabelText(/total harga/i), "350000");
    await userEvent.selectOptions(screen.getByLabelText(/metode bayar/i), "CASH");
    await userEvent.click(
      screen.getByRole("button", { name: /selesaikan order/i })
    );

    await waitFor(() =>
      expect(screen.queryByLabelText(/total harga/i)).not.toBeInTheDocument()
    );
    expect(orderApi.list.mock.calls.length).toBeGreaterThan(1);
  });

  it("menampilkan dialog notifikasi WhatsApp saat tombol Kabari WhatsApp diklik pada order READY", async () => {
    await renderAdmin();

    const menuAksi = screen.getAllByRole("button", { name: /menu aksi/i })[0];
    await userEvent.click(menuAksi);

    const tombolWa = screen.getByRole("menuitem", {
      name: /kabari whatsapp/i,
    });
    expect(tombolWa).toBeInTheDocument();

    await userEvent.click(tombolWa);

    expect(await screen.findByText(/order siap diambil!/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /kirim pesan whatsapp/i })
    ).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/6281234567890")
    );
  });


  it("menampilkan pesan 409 dan dialog tetap terbuka", async () => {
    orderApi.selesaikan.mockRejectedValue({
      status: 409,
      message: "Hanya order berstatus READY yang bisa diselesaikan",
      errors: [],
    });

    await renderAdmin();

    await userEvent.click(screen.getByRole("button", { name: /selesaikan/i }));
    await screen.findByLabelText(/total harga/i);
    await userEvent.type(screen.getByLabelText(/total harga/i), "350000");
    await userEvent.selectOptions(screen.getByLabelText(/metode bayar/i), "CASH");
    await userEvent.click(
      screen.getByRole("button", { name: /selesaikan order/i })
    );

    expect(
      await screen.findByText(
        "Hanya order berstatus READY yang bisa diselesaikan"
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/total harga/i)).toBeInTheDocument();
  });
});

describe("PesananPage — membuat order", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    orderApi.list.mockResolvedValue(daftar([ORDER_READY]));
    customerApi.list.mockResolvedValue(daftar([BUDI]));
  });

  it("membuat order dengan pelanggan + jenis (file & qty diisi designer)", async () => {
    orderApi.create.mockResolvedValue({ ...ORDER_ANTRI });

    await renderAdmin();

    await userEvent.click(screen.getByRole("button", { name: /buat order/i }));
    await screen.findByText(/jumlah file & qty diisi designer/i);

    // pilih pelanggan lewat picker
    await userEvent.type(
      screen.getByLabelText(/^pelanggan$/i),
      "Budi"
    );
    await userEvent.click(await within(screen.getByRole("dialog")).findByText("Budi Santoso"));

    // pilih jenis
    await userEvent.selectOptions(
      screen.getByLabelText(/jenis sablon/i),
      "DTF"
    );

    await userEvent.click(
      screen.getByRole("button", { name: /^simpan order$/i })
    );

    await waitFor(() =>
      expect(orderApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: "c1",
          jenis: "DTF",
        })
      )
    );
  });

  it("membuat pelanggan baru lewat nomor lalu memakai customer_id-nya", async () => {
    // Tidak ada pelanggan yang cocok → tawaran buat baru.
    customerApi.list.mockResolvedValue(daftar([]));
    // Pelanggan baru dibuat oleh CustomerPicker (POST /customers).
    customerApi.create.mockResolvedValue({
      _id: "c9",
      name: "Citra Dewi",
      whatsapp: "6281299998888",
    });
    orderApi.create.mockResolvedValue({ ...ORDER_ANTRI });

    await renderAdmin();

    await userEvent.click(screen.getByRole("button", { name: /buat order/i }));
    await screen.findByText(/jumlah file & qty diisi designer/i);

    // ketik nomor yang belum terdaftar → sub-form pelanggan baru muncul inline
    await userEvent.type(
      screen.getByLabelText(/^pelanggan$/i),
      "081299998888"
    );

    // isi nama pelanggan baru → CustomerPicker POST /customers
    await userEvent.type(
      await screen.findByLabelText(/nama pelanggan/i),
      "Citra Dewi"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /gunakan pelanggan baru/i })
    );

    await waitFor(() =>
      expect(customerApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          whatsapp: "6281299998888",
          name: "Citra Dewi",
        })
      )
    );

    await userEvent.selectOptions(screen.getByLabelText(/jenis sablon/i), "DTF");
    await userEvent.click(
      screen.getByRole("button", { name: /^simpan order$/i })
    );

    await waitFor(() =>
      expect(orderApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: "c9",
          jenis: "DTF",
        })
      )
    );
  });

  it("tidak memanggil create kalau pelanggan/jenis belum lengkap", async () => {
    await renderAdmin();

    await userEvent.click(screen.getByRole("button", { name: /buat order/i }));
    await screen.findByText(/jumlah file & qty diisi designer/i);

    await userEvent.click(
      screen.getByRole("button", { name: /^simpan order$/i })
    );

    expect(await screen.findByText(/pelanggan wajib dipilih/i)).toBeInTheDocument();
    expect(orderApi.create).not.toHaveBeenCalled();
  });

  it("tidak lagi menampilkan input jumlah file / total qty di form order", async () => {
    await renderAdmin();

    await userEvent.click(screen.getByRole("button", { name: /buat order/i }));
    await screen.findByText(/jumlah file & qty diisi designer/i);

    expect(screen.queryByLabelText(/jumlah file/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/total qty/i)).not.toBeInTheDocument();
  });
});

describe("PesananPage — filter", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    orderApi.list.mockResolvedValue(daftar([ORDER_READY]));
    customerApi.list.mockResolvedValue(daftar([BUDI]));
  });

  it("mengirim filter jenis ke API", async () => {
    await renderAdmin();

    await userEvent.selectOptions(screen.getByLabelText(/^jenis$/i), "POLYFLEX");

    await waitFor(() =>
      expect(orderApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ jenis: "POLYFLEX" })
      )
    );
  });

  it("mengirim filter status ke API", async () => {
    await renderAdmin();

    await userEvent.selectOptions(screen.getByLabelText(/^status$/i), "READY");

    await waitFor(() =>
      expect(orderApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: "READY" })
      )
    );
  });

  it("default menyembunyikan order SELESAI (kirim aktif=true tanpa filter status)", async () => {
    await renderAdmin();

    await waitFor(() =>
      expect(orderApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ aktif: true })
      )
    );
    // Tidak mengunci status apa pun saat aktif dipakai.
    expect(orderApi.list).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: expect.anything() })
    );
  });

  it("memilih status Selesai menampilkan yang selesai (status menang, aktif tidak dikirim)", async () => {
    await renderAdmin();

    await userEvent.selectOptions(screen.getByLabelText(/^status$/i), "SELESAI");

    await waitFor(() =>
      expect(orderApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: "SELESAI", aktif: undefined })
      )
    );
  });
});

describe("PesananPage — detail & tracking", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    orderApi.list.mockResolvedValue(daftar([ORDER_READY, ORDER_ANTRI]));
    customerApi.list.mockResolvedValue(daftar([BUDI]));
  });

  it("membuka dialog detail dan menampilkan timeline pelaku tiap langkah", async () => {
    orderApi.detail.mockResolvedValue({
      ...ORDER_READY,
    });
    orderApi.riwayat.mockResolvedValue([
      {
        _id: "l1",
        status_dari: null,
        status_ke: "ANTRI_DESAIN",
        user_id: { _id: "u1", name: "Admin RCF", role: "ADMIN" },
        catatan: "",
        createdAt: "2026-08-22T03:00:00.000Z",
      },
      {
        _id: "l2",
        status_dari: "ANTRI_DESAIN",
        status_ke: "ANTRI_CETAK",
        user_id: { _id: "u2", name: "Desi Desainer", role: "DESIGNER" },
        catatan: "file siap cetak",
        createdAt: "2026-08-22T05:30:00.000Z",
      },
    ]);

    await renderAdmin();

    // buka detail untuk baris pertama (order READY)
    const menuAksi = screen.getAllByRole("button", { name: /menu aksi/i })[0];
    await userEvent.click(menuAksi);
    await userEvent.click(screen.getByRole("menuitem", { name: /detail order/i }));

    // ringkasan + timeline muncul
    expect(await screen.findByText(/riwayat proses/i)).toBeInTheDocument();
    expect(screen.getByText("Admin RCF")).toBeInTheDocument();
    expect(screen.getByText("Desi Desainer")).toBeInTheDocument();
    expect(screen.getByText(/file siap cetak/i)).toBeInTheDocument();

    await waitFor(() => expect(orderApi.detail).toHaveBeenCalledWith("o1"));
    expect(orderApi.riwayat).toHaveBeenCalledWith("o1");
  });

  it("menampilkan tombol menu aksi di setiap baris", async () => {
    await renderAdmin();
    expect(
      screen.getAllByRole("button", { name: /menu aksi/i })
    ).toHaveLength(2);
  });
});

describe("PesananPage — koreksi status", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    orderApi.list.mockResolvedValue(daftar([ORDER_READY, ORDER_ANTRI]));
    customerApi.list.mockResolvedValue(daftar([BUDI]));
  });

  it("menampilkan tombol menu aksi di setiap baris", async () => {
    await renderAdmin();

    const tombol = screen.getAllByRole("button", { name: /menu aksi/i });
    expect(tombol).toHaveLength(2);
  });

  it("membatasi opsi status ke alur jenis order dan membuang status sekarang", async () => {
    await renderAdmin();

    // buka koreksi untuk order READY (baris pertama) lewat menu aksi
    const menuAksi = screen.getAllByRole("button", { name: /menu aksi/i })[0];
    await userEvent.click(menuAksi);
    await userEvent.click(
      screen.getByRole("menuitem", { name: /koreksi status/i })
    );
    await screen.findByLabelText(/status tujuan/i);

    const select = screen.getByLabelText(/status tujuan/i);
    const nilai = Array.from(select.querySelectorAll("option")).map(
      (o) => o.value
    );

    // DTF: ANTRI_DESAIN, ANTRI_CETAK, PACKING, READY, SELESAI — minus READY
    // (status sekarang). Nilai "" adalah placeholder.
    expect(nilai).toContain("ANTRI_CETAK");
    expect(nilai).toContain("PACKING");
    expect(nilai).not.toContain("READY");
    // status khusus jenis lain tidak boleh muncul untuk order DTF
    expect(nilai).not.toContain("ANTRI_CUTTING");
    expect(nilai).not.toContain("ANTRI_SUBLIM");
  });

  it("mengirim id + status + alasan saat koreksi", async () => {
    orderApi.koreksi.mockResolvedValue({
      ...ORDER_READY,
      status: "PACKING",
    });

    await renderAdmin();

    const menuAksi = screen.getAllByRole("button", { name: /menu aksi/i })[0];
    await userEvent.click(menuAksi);
    await userEvent.click(
      screen.getByRole("menuitem", { name: /koreksi status/i })
    );
    await screen.findByLabelText(/status tujuan/i);

    await userEvent.selectOptions(
      screen.getByLabelText(/status tujuan/i),
      "PACKING"
    );
    await userEvent.type(
      screen.getByLabelText(/alasan koreksi/i),
      "keliru tandai siap"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /^koreksi status$/i })
    );

    await waitFor(() =>
      expect(orderApi.koreksi).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "o1",
          status: "PACKING",
          catatan: "keliru tandai siap",
        })
      )
    );
  });

  it("wajib mengisi alasan sebelum submit koreksi", async () => {
    await renderAdmin();

    const menuAksi = screen.getAllByRole("button", { name: /menu aksi/i })[0];
    await userEvent.click(menuAksi);
    await userEvent.click(
      screen.getByRole("menuitem", { name: /koreksi status/i })
    );
    await screen.findByLabelText(/status tujuan/i);

    await userEvent.selectOptions(
      screen.getByLabelText(/status tujuan/i),
      "PACKING"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /^koreksi status$/i })
    );

    expect(
      await screen.findByText(/alasan koreksi wajib diisi/i)
    ).toBeInTheDocument();
    expect(orderApi.koreksi).not.toHaveBeenCalled();
  });

  describe("Edit dan Hapus Order", () => {
    it("membuka modal edit dengan data terisi dan memanggil orderApi.update saat disimpan", async () => {
      orderApi.update.mockResolvedValue({
        ...ORDER_READY,
        catatan: "Revisi catatan",
      });

      await renderAdmin();

      const menuAksi = screen.getAllByRole("button", { name: /menu aksi/i })[0];
      await userEvent.click(menuAksi);
      await userEvent.click(
        screen.getByRole("menuitem", { name: /edit order/i })
      );

      // Judul modal edit muncul
      expect(
        await screen.findByText(`Edit Order ${ORDER_READY.kode_order}`)
      ).toBeInTheDocument();

      // Ubah catatan — jumlah file & qty bukan lagi field admin (designer yang
      // menentukannya saat selesai desain).
      const inputCatatan = screen.getByLabelText(/catatan/i);
      await userEvent.clear(inputCatatan);
      await userEvent.type(inputCatatan, "Revisi catatan");

      await userEvent.click(
        screen.getByRole("button", { name: /simpan perubahan/i })
      );

      await waitFor(() =>
        expect(orderApi.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "o1",
            catatan: "Revisi catatan",
          })
        )
      );
    });

    it("membuka dialog konfirmasi dan memanggil orderApi.remove saat order dihapus", async () => {
      orderApi.remove.mockResolvedValue({ id: "o1" });

      await renderAdmin();

      const menuAksi = screen.getAllByRole("button", { name: /menu aksi/i })[0];
      await userEvent.click(menuAksi);
      await userEvent.click(
        screen.getByRole("menuitem", { name: /hapus order/i })
      );

      // ConfirmDialog muncul
      expect(
        await screen.findByText(/apakah anda yakin ingin menghapus order/i)
      ).toBeInTheDocument();

      // Klik tombol konfirmasi di dialog
      await userEvent.click(
        screen.getByRole("button", { name: /^hapus order$/i })
      );

      await waitFor(() =>
        expect(orderApi.remove).toHaveBeenCalledWith("o1")
      );
    });
  });
});


