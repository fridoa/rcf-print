import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { LoginPage } from "@/features/auth";
import { renderWithProviders } from "@/test/renderWithProviders";

// Modul api dimock supaya test tidak menyentuh jaringan.
vi.mock("@/features/auth/api/auth.api", () => ({
  authApi: {
    login: vi.fn(),
    me: vi.fn(),
    editProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}));

const { authApi } = await import("@/features/auth/api/auth.api");

const USER_ADMIN = {
  _id: "1",
  name: "Admin RCF",
  username: "admin",
  email: "admin@rcfprint.com",
  role: "ADMIN",
};

/** Struktur route minimal: /login + halaman tujuan yang bisa dideteksi. */
function LoginRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<p>HALAMAN DASHBOARD</p>} />
      <Route path="/pesanan" element={<p>HALAMAN PESANAN</p>} />
    </Routes>
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it("menyimpan token dan pindah ke dashboard setelah login sukses", async () => {
    authApi.login.mockResolvedValue({ token: "tok-123", user: USER_ADMIN });

    renderWithProviders(<LoginRoutes />, { routes: ["/login"] });

    await userEvent.type(
      screen.getByLabelText(/username atau email/i),
      "admin"
    );
    await userEvent.type(screen.getByLabelText(/^password$/i), "rahasia123");
    await userEvent.click(screen.getByRole("button", { name: /masuk/i }));

    expect(await screen.findByText("HALAMAN DASHBOARD")).toBeInTheDocument();
    expect(localStorage.getItem("rcf.token")).toBe("tok-123");
    expect(authApi.login).toHaveBeenCalledWith({
      identifier: "admin",
      password: "rahasia123",
    });
  });

  it("menampilkan pesan server dan tetap di halaman login saat kredensial salah", async () => {
    authApi.login.mockRejectedValue({
      status: 401,
      message: "Username/email atau password salah",
      errors: [],
    });

    renderWithProviders(<LoginRoutes />, { routes: ["/login"] });

    await userEvent.type(screen.getByLabelText(/username atau email/i), "admin");
    await userEvent.type(screen.getByLabelText(/^password$/i), "salahbanget");
    await userEvent.click(screen.getByRole("button", { name: /masuk/i }));

    expect(
      await screen.findByText("Username/email atau password salah")
    ).toBeInTheDocument();
    expect(screen.queryByText("HALAMAN DASHBOARD")).not.toBeInTheDocument();
    expect(localStorage.getItem("rcf.token")).toBeNull();
  });

  it("menampilkan pesan akun tidak aktif (403) apa adanya dari server", async () => {
    authApi.login.mockRejectedValue({
      status: 403,
      message: "Akun Anda tidak aktif, hubungi admin",
      errors: [],
    });

    renderWithProviders(<LoginRoutes />, { routes: ["/login"] });

    await userEvent.type(screen.getByLabelText(/username atau email/i), "budi");
    await userEvent.type(screen.getByLabelText(/^password$/i), "rahasia123");
    await userEvent.click(screen.getByRole("button", { name: /masuk/i }));

    expect(
      await screen.findByText("Akun Anda tidak aktif, hubungi admin")
    ).toBeInTheDocument();
  });

  it("tidak memanggil API kalau validasi lokal gagal", async () => {
    renderWithProviders(<LoginRoutes />, { routes: ["/login"] });

    await userEvent.click(screen.getByRole("button", { name: /masuk/i }));

    await screen.findByText("Password wajib diisi");
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it("mengalihkan user yang sudah login ke dashboard tanpa menampilkan form", async () => {
    localStorage.setItem("rcf.token", "tok-lama");
    authApi.me.mockResolvedValue(USER_ADMIN);

    renderWithProviders(<LoginRoutes />, { routes: ["/login"] });

    expect(await screen.findByText("HALAMAN DASHBOARD")).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it("menonaktifkan tombol selama request login berjalan", async () => {
    let selesaikan;
    authApi.login.mockImplementation(
      () => new Promise((resolve) => (selesaikan = resolve))
    );

    renderWithProviders(<LoginRoutes />, { routes: ["/login"] });

    await userEvent.type(screen.getByLabelText(/username atau email/i), "admin");
    await userEvent.type(screen.getByLabelText(/^password$/i), "rahasia123");
    await userEvent.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /masuk/i })).toBeDisabled()
    );

    selesaikan({ token: "tok-123", user: USER_ADMIN });
    expect(await screen.findByText("HALAMAN DASHBOARD")).toBeInTheDocument();
  });
});
