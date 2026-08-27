import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { UserListPage } from "@/features/users";
import { renderWithProviders } from "@/test/renderWithProviders";
import { ROLES } from "@/shared/constants/roles";

/**
 * Test alur UserListPage end-to-end dengan API di-mock. Pola sama dengan
 * CustomerMutations.test.jsx: auth.api.me dipakai AuthProvider untuk
 * mengisi user yang sedang login, user.api untuk data tabel & mutasi.
 */

vi.mock("@/features/auth/api/auth.api", () => ({
  authApi: {
    login: vi.fn(),
    me: vi.fn(),
    editProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}));

vi.mock("@/features/users/api/user.api", () => ({
  userApi: {
    list: vi.fn(),
    detail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    resetPassword: vi.fn(),
    remove: vi.fn(),
  },
}));

const { authApi } = await import("@/features/auth/api/auth.api");
const { userApi } = await import("@/features/users/api/user.api");

const ADMIN = {
  _id: "u1",
  name: "Admin RCF",
  username: "admin",
  email: "admin@rcfprint.com",
  role: ROLES.ADMIN,
  isActive: true,
};

const BUDI = {
  _id: "u2",
  name: "Budi Desainer",
  username: "budi",
  email: "budi@rcfprint.com",
  role: ROLES.DESIGNER,
  isActive: true,
};

const daftar = (items = [ADMIN, BUDI]) => ({
  items,
  pagination: { page: 1, limit: 20, total: items.length, totalPages: 1 },
});

function UserRoutes() {
  return (
    <Routes>
      <Route path="/pengguna" element={<UserListPage />} />
    </Routes>
  );
}

async function renderAdmin() {
  localStorage.setItem("rcf.token", "tok-123");
  authApi.me.mockResolvedValue(ADMIN);

  const hasil = renderWithProviders(<UserRoutes />, { routes: ["/pengguna"] });
  await screen.findByText("Budi Desainer");
  return hasil;
}

const bukaFormTambah = async () => {
  await userEvent.click(screen.getByRole("button", { name: /tambah user/i }));
  await screen.findByLabelText(/^password$/i);
};

const bukaFormUbah = async () => {
  await userEvent.click(screen.getByRole("button", { name: /ubah budi desainer/i }));
  await screen.findByLabelText(/^username$/i);
};

describe("UserListPage — tambah user", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    userApi.list.mockResolvedValue(daftar());
  });

  it("mengirim payload lengkap dengan isActive boolean", async () => {
    userApi.create.mockResolvedValue({ ...BUDI, _id: "u9", name: "User Baru" });

    await renderAdmin();
    await bukaFormTambah();

    await userEvent.type(screen.getByLabelText(/^nama$/i), "User Baru");
    await userEvent.type(screen.getByLabelText(/^username$/i), "userbaru");
    await userEvent.type(
      screen.getByLabelText(/^email$/i),
      "userbaru@rcfprint.com"
    );
    await userEvent.type(screen.getByLabelText(/^password$/i), "rahasia123");
    await userEvent.selectOptions(
      screen.getByLabelText(/^role$/i),
      ROLES.PRODUKSI
    );
    await userEvent.click(screen.getByRole("button", { name: /simpan user/i }));

    await waitFor(() =>
      expect(userApi.create).toHaveBeenCalledWith({
        name: "User Baru",
        username: "userbaru",
        email: "userbaru@rcfprint.com",
        password: "rahasia123",
        role: ROLES.PRODUKSI,
        isActive: true,
      })
    );
  });

  it("menutup dialog dan memuat ulang daftar setelah sukses", async () => {
    userApi.create.mockResolvedValue({ _id: "u9", name: "User Baru" });

    await renderAdmin();
    await bukaFormTambah();

    await userEvent.type(screen.getByLabelText(/^nama$/i), "User Baru");
    await userEvent.type(screen.getByLabelText(/^username$/i), "userbaru");
    await userEvent.type(
      screen.getByLabelText(/^email$/i),
      "userbaru@rcfprint.com"
    );
    await userEvent.type(screen.getByLabelText(/^password$/i), "rahasia123");
    await userEvent.selectOptions(
      screen.getByLabelText(/^role$/i),
      ROLES.PACKING
    );
    await userEvent.click(screen.getByRole("button", { name: /simpan user/i }));

    await waitFor(() =>
      expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument()
    );
    expect(userApi.list.mock.calls.length).toBeGreaterThan(1);
  });

  it("menampilkan pesan 409 dari server dan dialog tetap terbuka", async () => {
    userApi.create.mockRejectedValue({
      status: 409,
      message: "Username sudah dipakai user lain",
      errors: [],
    });

    await renderAdmin();
    await bukaFormTambah();

    await userEvent.type(screen.getByLabelText(/^nama$/i), "Kembar");
    await userEvent.type(screen.getByLabelText(/^username$/i), "budi");
    await userEvent.type(screen.getByLabelText(/^email$/i), "kembar@rcfprint.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "rahasia123");
    await userEvent.selectOptions(screen.getByLabelText(/^role$/i), ROLES.PACKING);
    await userEvent.click(screen.getByRole("button", { name: /simpan user/i }));

    expect(
      await screen.findByText("Username sudah dipakai user lain")
    ).toBeInTheDocument();
    // isian tidak hilang supaya admin bisa memperbaiki
    expect(screen.getByLabelText(/^username$/i)).toHaveValue("budi");
  });
});

describe("UserListPage — ubah user", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    userApi.list.mockResolvedValue(daftar());
  });

  it("hanya mengirim field yang diubah, beserta id", async () => {
    userApi.update.mockResolvedValue({ ...BUDI, role: ROLES.PRODUKSI });

    await renderAdmin();
    await bukaFormUbah();

    await userEvent.selectOptions(
      screen.getByLabelText(/^role$/i),
      ROLES.PRODUKSI
    );
    await userEvent.click(
      screen.getByRole("button", { name: /simpan perubahan/i })
    );

    await waitFor(() =>
      expect(userApi.update).toHaveBeenCalledWith({
        id: "u2",
        role: ROLES.PRODUKSI,
      })
    );
  });

  it("tombol simpan mati sebelum ada perubahan", async () => {
    await renderAdmin();
    await bukaFormUbah();

    expect(
      screen.getByRole("button", { name: /simpan perubahan/i })
    ).toBeDisabled();
    expect(userApi.update).not.toHaveBeenCalled();
  });
});

describe("UserListPage — reset password", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    userApi.list.mockResolvedValue(daftar());
  });

  it("mengirim id dan password baru lalu menampilkan pesan sukses", async () => {
    userApi.resetPassword.mockResolvedValue("Password user berhasil direset");

    await renderAdmin();
    await userEvent.click(
      screen.getByRole("button", { name: /reset password budi desainer/i })
    );
    await screen.findByLabelText(/password baru/i);

    await userEvent.type(
      screen.getByLabelText(/password baru/i),
      "passwordbaru123"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /^reset password$/i })
    );

    await waitFor(() =>
      expect(userApi.resetPassword).toHaveBeenCalledWith({
        id: "u2",
        newPassword: "passwordbaru123",
      })
    );
    expect(
      await screen.findByText("Password berhasil direset")
    ).toBeInTheDocument();
  });

  it("menolak password baru terlalu pendek tanpa memanggil API", async () => {
    await renderAdmin();
    await userEvent.click(
      screen.getByRole("button", { name: /reset password budi desainer/i })
    );
    await screen.findByLabelText(/password baru/i);

    await userEvent.type(screen.getByLabelText(/password baru/i), "abc");
    await userEvent.click(
      screen.getByRole("button", { name: /^reset password$/i })
    );

    expect(
      await screen.findByText(/password baru minimal 6 karakter/i)
    ).toBeInTheDocument();
    expect(userApi.resetPassword).not.toHaveBeenCalled();
  });
});

describe("UserListPage — hapus user", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    userApi.list.mockResolvedValue(daftar());
  });

  it("tombol hapus untuk diri sendiri dinonaktifkan", async () => {
    await renderAdmin();

    const barisAdmin = screen.getByText("Admin RCF").closest("tr");
    const tombolHapus = within(barisAdmin).getByRole("button", {
      name: /hapus admin rcf/i,
    });
    expect(tombolHapus).toBeDisabled();
  });

  it("menghapus user lain setelah dikonfirmasi lalu memuat ulang", async () => {
    userApi.remove.mockResolvedValue("User berhasil dihapus");

    await renderAdmin();
    await userEvent.click(
      screen.getByRole("button", { name: /hapus budi desainer/i })
    );
    await screen.findByText(/tindakan ini tidak bisa dibatalkan/i);

    await userEvent.click(screen.getByRole("button", { name: /^hapus$/i }));

    await waitFor(() => expect(userApi.remove).toHaveBeenCalledWith("u2"));
    expect(userApi.list.mock.calls.length).toBeGreaterThan(1);
  });

  it("menampilkan pesan 409 admin terakhir dan dialog tetap terbuka", async () => {
    userApi.remove.mockRejectedValue({
      status: 409,
      message: "Tidak bisa menghapus admin aktif terakhir",
      errors: [],
    });

    await renderAdmin();
    await userEvent.click(
      screen.getByRole("button", { name: /hapus budi desainer/i })
    );
    await screen.findByText(/tindakan ini tidak bisa dibatalkan/i);

    await userEvent.click(screen.getByRole("button", { name: /^hapus$/i }));

    expect(
      await screen.findByText("Tidak bisa menghapus admin aktif terakhir")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/tindakan ini tidak bisa dibatalkan/i)
    ).toBeInTheDocument();
  });
});

describe("UserListPage — filter", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    userApi.list.mockResolvedValue(daftar());
  });

  it("meneruskan filter role ke API", async () => {
    await renderAdmin();

    await userEvent.selectOptions(
      screen.getByLabelText(/^role$/i),
      ROLES.DESIGNER
    );

    await waitFor(() =>
      expect(
        userApi.list.mock.calls.some(
          ([arg]) => arg?.role === ROLES.DESIGNER
        )
      ).toBe(true)
    );
  });

  it("meneruskan filter status ke API sebagai string", async () => {
    await renderAdmin();

    await userEvent.selectOptions(screen.getByLabelText(/^status$/i), "false");

    await waitFor(() =>
      expect(
        userApi.list.mock.calls.some(([arg]) => arg?.isActive === "false")
      ).toBe(true)
    );
  });
});
