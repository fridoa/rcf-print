import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { LoginPage, RequireAuth } from "@/features/auth";
import { renderWithProviders } from "@/test/renderWithProviders";

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
  role: "ADMIN",
};

function GuardedRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<p>HALAMAN DASHBOARD</p>} />
        <Route path="/pesanan" element={<p>HALAMAN PESANAN</p>} />
      </Route>
    </Routes>
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it("mengalihkan ke /login kalau belum ada token", async () => {
    renderWithProviders(<GuardedRoutes />, { routes: ["/pesanan"] });

    expect(
      await screen.findByRole("button", { name: /masuk/i })
    ).toBeInTheDocument();
    expect(screen.queryByText("HALAMAN PESANAN")).not.toBeInTheDocument();
    expect(authApi.me).not.toHaveBeenCalled();
  });

  it("menampilkan indikator sesi saat token masih divalidasi, bukan langsung menendang ke login", async () => {
    localStorage.setItem("rcf.token", "tok-123");
    let selesaikan;
    authApi.me.mockImplementation(
      () => new Promise((resolve) => (selesaikan = resolve))
    );

    renderWithProviders(<GuardedRoutes />, { routes: ["/"] });

    // Inilah regresi yang dijaga: refresh halaman tidak boleh membuang
    // user yang tokennya masih sah.
    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /masuk/i })).toBeNull();

    selesaikan(USER_ADMIN);
    expect(await screen.findByText("HALAMAN DASHBOARD")).toBeInTheDocument();
  });

  it("meloloskan user setelah /auth/me sukses", async () => {
    localStorage.setItem("rcf.token", "tok-123");
    authApi.me.mockResolvedValue(USER_ADMIN);

    renderWithProviders(<GuardedRoutes />, { routes: ["/pesanan"] });

    expect(await screen.findByText("HALAMAN PESANAN")).toBeInTheDocument();
  });

  it("membuang token dan mengalihkan ke login kalau /auth/me gagal", async () => {
    localStorage.setItem("rcf.token", "tok-kedaluwarsa");
    authApi.me.mockRejectedValue({ status: 401, message: "Token tidak valid" });

    renderWithProviders(<GuardedRoutes />, { routes: ["/"] });

    expect(
      await screen.findByRole("button", { name: /masuk/i })
    ).toBeInTheDocument();
    expect(localStorage.getItem("rcf.token")).toBeNull();
  });

  it("mengembalikan user ke halaman yang tadi dituju setelah login", async () => {
    authApi.login.mockResolvedValue({ token: "tok-123", user: USER_ADMIN });

    renderWithProviders(<GuardedRoutes />, { routes: ["/pesanan"] });

    // Ditendang ke login dulu...
    await screen.findByRole("button", { name: /masuk/i });

    await userEvent.type(screen.getByLabelText(/username atau email/i), "admin");
    await userEvent.type(screen.getByLabelText(/^password$/i), "rahasia123");
    await userEvent.click(screen.getByRole("button", { name: /masuk/i }));

    // ...lalu kembali ke /pesanan, bukan ke dashboard.
    expect(await screen.findByText("HALAMAN PESANAN")).toBeInTheDocument();
  });
});
