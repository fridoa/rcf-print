import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppLayout } from "@/app/AppLayout";

/**
 * Fokus: tombol Keluar TIDAK langsung logout — harus lewat ConfirmDialog dulu
 * (antisipasi kepencet). useAuth di-mock supaya bisa memata-matai logout().
 */

const logout = vi.fn();

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    user: { name: "Admin RCF", role: "ADMIN" },
    logout,
  }),
}));

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AppLayout />
    </MemoryRouter>
  );
}

describe("AppLayout — konfirmasi logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tidak langsung logout saat tombol Keluar ditekan, hanya buka dialog", async () => {
    renderLayout();

    // Sidebar desktop selalu ter-render; ambil tombol Keluar pertama.
    await userEvent.click(screen.getAllByRole("button", { name: /^keluar$/i })[0]);

    expect(
      await screen.findByText(/keluar dari akun\?/i)
    ).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });

  it("logout dipanggil hanya setelah konfirmasi", async () => {
    renderLayout();

    await userEvent.click(screen.getAllByRole("button", { name: /^keluar$/i })[0]);
    await screen.findByText(/keluar dari akun\?/i);

    // Tombol konfirmasi di dalam dialog berlabel "Keluar" juga; yang terakhir.
    const tombol = screen.getAllByRole("button", { name: /^keluar$/i });
    await userEvent.click(tombol[tombol.length - 1]);

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });

  it("batal menutup dialog tanpa logout", async () => {
    renderLayout();

    await userEvent.click(screen.getAllByRole("button", { name: /^keluar$/i })[0]);
    await screen.findByText(/keluar dari akun\?/i);

    await userEvent.click(screen.getByRole("button", { name: /^batal$/i }));

    await waitFor(() =>
      expect(screen.queryByText(/keluar dari akun\?/i)).not.toBeInTheDocument()
    );
    expect(logout).not.toHaveBeenCalled();
  });
});
