import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangePasswordForm } from "../components/ChangePasswordForm";

/**
 * Test komponen saja. Alur lengkap (mutation, pesan sukses, remount lewat
 * key) sudah dijaga ChangePasswordPage.test.jsx — di sini yang diuji
 * akibat field dibungkus <Controller>.
 */

const renderForm = (props = {}) => {
  const semua = { onSubmit: vi.fn(), ...props };
  const hasil = render(<ChangePasswordForm {...semua} />);

  return {
    ...hasil,
    rerenderDengan: (patchProps) =>
      hasil.rerender(<ChangePasswordForm {...semua} {...patchProps} />),
  };
};

const isiForm = async ({
  lama = "rahasialama",
  baru = "rahasiabaru",
  konfirmasi = baru,
} = {}) => {
  await userEvent.type(screen.getByLabelText(/password lama/i), lama);
  await userEvent.type(screen.getByLabelText(/^password baru$/i), baru);
  await userEvent.type(
    screen.getByLabelText(/konfirmasi password baru/i),
    konfirmasi
  );
};

const klikSimpan = () =>
  userEvent.click(screen.getByRole("button", { name: /ubah password/i }));

describe("ChangePasswordForm — field controlled", () => {
  it("ketiga field mulai kosong, bukan undefined", () => {
    renderForm();

    expect(screen.getByLabelText(/password lama/i)).toHaveValue("");
    expect(screen.getByLabelText(/^password baru$/i)).toHaveValue("");
    expect(screen.getByLabelText(/konfirmasi password baru/i)).toHaveValue("");
  });

  it("tidak memunculkan peringatan controlled/uncontrolled dari React", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderForm();
    await userEvent.type(screen.getByLabelText(/password lama/i), "rahasia");

    const pesan = spy.mock.calls.flat().join(" ");
    expect(pesan).not.toMatch(/uncontrolled input to be controlled/i);

    spy.mockRestore();
  });

  it("ketiga input tetap bertipe password", () => {
    renderForm();

    // Regresi yang mudah terjadi saat memindahkan prop ke Controller:
    // `type` ikut hilang dan password tampil sebagai teks biasa.
    expect(screen.getByLabelText(/password lama/i)).toHaveAttribute(
      "type",
      "password"
    );
    expect(screen.getByLabelText(/^password baru$/i)).toHaveAttribute(
      "type",
      "password"
    );
    expect(screen.getByLabelText(/konfirmasi password baru/i)).toHaveAttribute(
      "type",
      "password"
    );
  });

  it("memakai autocomplete yang benar supaya password manager tidak salah menawarkan", () => {
    renderForm();

    expect(screen.getByLabelText(/password lama/i)).toHaveAttribute(
      "autocomplete",
      "current-password"
    );
    expect(screen.getByLabelText(/^password baru$/i)).toHaveAttribute(
      "autocomplete",
      "new-password"
    );
    expect(screen.getByLabelText(/konfirmasi password baru/i)).toHaveAttribute(
      "autocomplete",
      "new-password"
    );
  });

  it("menampilkan apa yang diketik", async () => {
    renderForm();

    const input = screen.getByLabelText(/password lama/i);
    await userEvent.type(input, "rahasialama");

    expect(input).toHaveValue("rahasialama");
  });
});

describe("ChangePasswordForm — payload", () => {
  it("mengirim ketiga field dengan nama sesuai backend", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await isiForm();
    await klikSimpan();

    // confirmPassword ikut dikirim — validator backend punya aturan oneOf
    // sendiri dan memang mengharapkannya.
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      oldPassword: "rahasialama",
      newPassword: "rahasiabaru",
      confirmPassword: "rahasiabaru",
    });
  });

  it("tidak men-trim password", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await isiForm({ lama: " rahasialama ", baru: "rahasiabaru" });
    await klikSimpan();

    // Spasi bisa jadi bagian password yang sah; men-trim-nya akan membuat
    // user gagal login dengan password yang dia kira sudah benar.
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].oldPassword).toBe(" rahasialama ");
  });
});

describe("ChangePasswordForm — validasi", () => {
  it("menampilkan ketiga pesan wajib saat form kosong", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await klikSimpan();

    expect(
      await screen.findByText(/password lama wajib diisi/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/password baru wajib diisi/i)).toBeInTheDocument();
    expect(
      screen.getByText(/konfirmasi password wajib diisi/i)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("menolak konfirmasi yang tidak sama", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await isiForm({ baru: "rahasiabaru", konfirmasi: "rahasialain" });
    await klikSimpan();

    expect(
      await screen.findByText(/konfirmasi password tidak sama/i)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("menolak password baru yang sama dengan password lama", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await isiForm({ lama: "rahasialama", baru: "rahasialama" });
    await klikSimpan();

    expect(
      await screen.findByText(/tidak boleh sama dengan password lama/i)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("menolak password baru di bawah 6 karakter", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await isiForm({ baru: "abc" });
    await klikSimpan();

    expect(
      await screen.findByText(/password baru minimal 6 karakter/i)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("menandai input yang error dengan aria-invalid", async () => {
    renderForm();

    await klikSimpan();
    await screen.findByText(/password lama wajib diisi/i);

    expect(screen.getByLabelText(/password lama/i)).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });

  it("menghapus error konfirmasi setelah diperbaiki", async () => {
    renderForm();

    await isiForm({ baru: "rahasiabaru", konfirmasi: "rahasialain" });
    await klikSimpan();
    await screen.findByText(/konfirmasi password tidak sama/i);

    const konfirmasi = screen.getByLabelText(/konfirmasi password baru/i);
    await userEvent.clear(konfirmasi);
    await userEvent.type(konfirmasi, "rahasiabaru");

    await waitFor(() =>
      expect(
        screen.queryByText(/konfirmasi password tidak sama/i)
      ).not.toBeInTheDocument()
    );
  });
});

describe("ChangePasswordForm — status dan pesan", () => {
  it("menonaktifkan tombol saat isSubmitting", () => {
    renderForm({ isSubmitting: true });

    const tombol = screen.getByRole("button", { name: /menyimpan/i });
    expect(tombol).toBeDisabled();
    expect(tombol).toHaveAttribute("aria-busy", "true");
  });

  it("menampilkan pesan error server beserta detailnya", () => {
    renderForm({
      errorMessage: "Password lama salah",
      errorDetails: ["oldPassword tidak cocok"],
    });

    expect(screen.getByText("Password lama salah")).toBeInTheDocument();
    expect(screen.getByText("oldPassword tidak cocok")).toBeInTheDocument();
  });

  it("tidak mengosongkan isian saat error server muncul", async () => {
    const { rerenderDengan } = renderForm();

    await isiForm();

    // Setelah 401, halaman merender ulang form dengan errorMessage terisi
    // TANPA mengubah key, jadi isian harus tetap ada — user cukup
    // memperbaiki password lamanya.
    rerenderDengan({ errorMessage: "Password lama salah" });

    expect(screen.getByLabelText(/^password baru$/i)).toHaveValue("rahasiabaru");
    expect(screen.getByLabelText(/password lama/i)).toHaveValue("rahasialama");
  });

  it("menyembunyikan pesan sukses kalau ada error", () => {
    renderForm({
      successMessage: "Password berhasil diubah",
      errorMessage: "Password lama salah",
    });

    expect(
      screen.queryByText("Password berhasil diubah")
    ).not.toBeInTheDocument();
  });

  it("menampilkan pesan sukses saat tidak ada error", () => {
    renderForm({ successMessage: "Password berhasil diubah" });

    expect(screen.getByText("Password berhasil diubah")).toBeInTheDocument();
  });
});
