import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { ChangePasswordPage } from "@/features/auth";
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
  email: "admin@rcfprint.com",
  role: "ADMIN",
  isActive: true,
};

function PasswordRoutes() {
  return (
    <Routes>
      <Route path="/profil/ganti-password" element={<ChangePasswordPage />} />
      <Route path="/profil" element={<p>HALAMAN PROFIL</p>} />
    </Routes>
  );
}

async function renderLoggedIn() {
  localStorage.setItem("rcf.token", "tok-123");
  authApi.me.mockResolvedValue(USER_ADMIN);

  const hasil = renderWithProviders(<PasswordRoutes />, {
    routes: ["/profil/ganti-password"],
  });

  await screen.findByLabelText(/password lama/i);
  return hasil;
}

/** Isi ketiga input dengan nilai yang valid. */
async function isiForm({
  lama = "rahasia123",
  baru = "rahasiabaru",
  konfirmasi = "rahasiabaru",
} = {}) {
  await userEvent.type(screen.getByLabelText(/password lama/i), lama);
  await userEvent.type(screen.getByLabelText(/^password baru$/i), baru);
  await userEvent.type(
    screen.getByLabelText(/konfirmasi password baru/i),
    konfirmasi
  );
}

describe("ChangePasswordPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it("mengirim ketiga field ke server saat form valid", async () => {
    authApi.changePassword.mockResolvedValue("Password berhasil diubah");

    await renderLoggedIn();
    await isiForm();
    await userEvent.click(screen.getByRole("button", { name: /ubah password/i }));

    await waitFor(() =>
      expect(authApi.changePassword).toHaveBeenCalledWith({
        oldPassword: "rahasia123",
        newPassword: "rahasiabaru",
        confirmPassword: "rahasiabaru",
      })
    );
  });

  it("menampilkan pesan sukses dan mengosongkan form setelah berhasil", async () => {
    authApi.changePassword.mockResolvedValue("Password berhasil diubah");

    await renderLoggedIn();
    await isiForm();
    await userEvent.click(screen.getByRole("button", { name: /ubah password/i }));

    expect(
      await screen.findByText("Password berhasil diubah")
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByLabelText(/password lama/i)).toHaveValue("")
    );
    expect(screen.getByLabelText(/^password baru$/i)).toHaveValue("");
    expect(screen.getByLabelText(/konfirmasi password baru/i)).toHaveValue("");
  });

  it("token tetap tersimpan — user tidak dipaksa login ulang", async () => {
    authApi.changePassword.mockResolvedValue("Password berhasil diubah");

    await renderLoggedIn();
    await isiForm();
    await userEvent.click(screen.getByRole("button", { name: /ubah password/i }));

    expect(
      await screen.findByText("Password berhasil diubah")
    ).toBeInTheDocument();
    expect(localStorage.getItem("rcf.token")).toBe("tok-123");
  });

  it("menolak konfirmasi yang tidak sama tanpa memanggil API", async () => {
    await renderLoggedIn();
    await isiForm({ konfirmasi: "salah-ketik" });
    await userEvent.click(screen.getByRole("button", { name: /ubah password/i }));

    expect(
      await screen.findByText("Konfirmasi password tidak sama")
    ).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it("menolak password baru yang sama dengan password lama", async () => {
    await renderLoggedIn();
    await isiForm({ baru: "rahasia123", konfirmasi: "rahasia123" });
    await userEvent.click(screen.getByRole("button", { name: /ubah password/i }));

    expect(
      await screen.findByText(
        "Password baru tidak boleh sama dengan password lama"
      )
    ).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it("menolak password baru di bawah 6 karakter", async () => {
    await renderLoggedIn();
    await isiForm({ baru: "abc", konfirmasi: "abc" });
    await userEvent.click(screen.getByRole("button", { name: /ubah password/i }));

    expect(
      await screen.findByText("Password baru minimal 6 karakter")
    ).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it("menampilkan semua error wajib saat form kosong", async () => {
    await renderLoggedIn();
    await userEvent.click(screen.getByRole("button", { name: /ubah password/i }));

    expect(
      await screen.findByText("Password lama wajib diisi")
    ).toBeInTheDocument();
    expect(screen.getByText("Password baru wajib diisi")).toBeInTheDocument();
    expect(
      screen.getByText("Konfirmasi password wajib diisi")
    ).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it("menampilkan pesan 401 dari server saat password lama salah", async () => {
    authApi.changePassword.mockRejectedValue({
      status: 401,
      message: "Password lama salah",
      errors: [],
    });

    await renderLoggedIn();
    await isiForm({ lama: "salahbanget" });
    await userEvent.click(screen.getByRole("button", { name: /ubah password/i }));

    expect(await screen.findByText("Password lama salah")).toBeInTheDocument();
    expect(screen.queryByText("Password berhasil diubah")).not.toBeInTheDocument();
    // form tidak direset supaya user tidak perlu mengetik ulang semuanya
    expect(screen.getByLabelText(/^password baru$/i)).toHaveValue("rahasiabaru");
  });

  it("menonaktifkan tombol selama request berjalan", async () => {
    let selesaikan;
    authApi.changePassword.mockImplementation(
      () => new Promise((resolve) => (selesaikan = resolve))
    );

    await renderLoggedIn();
    await isiForm();
    await userEvent.click(screen.getByRole("button", { name: /ubah password/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /menyimpan/i })).toBeDisabled()
    );

    selesaikan("Password berhasil diubah");
    expect(
      await screen.findByText("Password berhasil diubah")
    ).toBeInTheDocument();
  });

  it("menyediakan tautan kembali ke profil", async () => {
    await renderLoggedIn();

    await userEvent.click(screen.getByRole("link", { name: /kembali ke profil/i }));

    expect(await screen.findByText("HALAMAN PROFIL")).toBeInTheDocument();
  });
});
