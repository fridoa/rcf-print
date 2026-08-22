import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditProfileForm } from "../components/EditProfileForm";

/**
 * Test komponen saja — tidak menyentuh react-query, AuthContext, maupun API.
 * Fokusnya akibat dari field dibungkus <Controller> (controlled) dan
 * dari pemakaian `values` alih-alih `defaultValues`. ProfilePage.test.jsx
 * tetap yang menguji alurnya end-to-end.
 */

const USER = {
  _id: "u1",
  name: "Admin RCF",
  username: "admin",
  email: "admin@rcfprint.com",
  role: "ADMIN",
};

const renderForm = (props = {}) => {
  const semua = { user: USER, onSubmit: vi.fn(), ...props };
  const hasil = render(<EditProfileForm {...semua} />);

  return {
    ...hasil,
    // rerender bawaan RTL mengganti seluruh elemen root, jadi dibungkus
    // supaya prop yang tidak disebut tetap sama seperti render pertama.
    rerenderDengan: (patchProps) =>
      hasil.rerender(<EditProfileForm {...semua} {...patchProps} />),
  };
};

describe("EditProfileForm — field controlled", () => {
  it("mengisi ketiga field dari prop user", () => {
    renderForm();

    expect(screen.getByLabelText(/^nama$/i)).toHaveValue("Admin RCF");
    expect(screen.getByLabelText(/^username$/i)).toHaveValue("admin");
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("admin@rcfprint.com");
  });

  it("menampilkan string kosong, bukan undefined, saat user belum ada", () => {
    // Bisa terjadi satu render sebelum restore sesi selesai.
    renderForm({ user: undefined });

    expect(screen.getByLabelText(/^nama$/i)).toHaveValue("");
    expect(screen.getByLabelText(/^username$/i)).toHaveValue("");
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("");
  });

  it("tidak memunculkan peringatan controlled/uncontrolled dari React", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderForm({ user: undefined });
    await userEvent.type(screen.getByLabelText(/^nama$/i), "Admin");

    const pesan = spy.mock.calls.flat().join(" ");
    expect(pesan).not.toMatch(/uncontrolled input to be controlled/i);

    spy.mockRestore();
  });

  it("menampilkan apa yang diketik", async () => {
    renderForm();

    const input = screen.getByLabelText(/^nama$/i);
    await userEvent.clear(input);
    await userEvent.type(input, "Admin Baru");

    expect(input).toHaveValue("Admin Baru");
  });

  it("ikut menampilkan data baru saat prop user berubah", async () => {
    const { rerenderDengan } = renderForm();

    // Inilah gunanya `values` alih-alih `defaultValues`: setelah simpan
    // sukses, AuthContext diperbarui dan form harus menyusul TANPA remount.
    // Dengan defaultValues, form akan tetap menampilkan nama lama.
    rerenderDengan({ user: { ...USER, name: "Admin Baru" } });

    await waitFor(() =>
      expect(screen.getByLabelText(/^nama$/i)).toHaveValue("Admin Baru")
    );
  });

  it("mengembalikan tombol ke keadaan mati setelah user diperbarui", async () => {
    const { rerenderDengan } = renderForm();

    const input = screen.getByLabelText(/^nama$/i);
    await userEvent.clear(input);
    await userEvent.type(input, "Admin Baru");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /simpan perubahan/i })
      ).toBeEnabled()
    );

    // Server membalas dengan nama baru → prop user berubah → nilai form
    // sama dengan values → isDirty kembali false tanpa reset manual.
    rerenderDengan({ user: { ...USER, name: "Admin Baru" } });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /simpan perubahan/i })
      ).toBeDisabled()
    );
  });
});

describe("EditProfileForm — payload PATCH partial", () => {
  it("mengirim hanya satu field yang diubah", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    const input = screen.getByLabelText(/^nama$/i);
    await userEvent.clear(input);
    await userEvent.type(input, "Admin Baru");
    await userEvent.click(
      screen.getByRole("button", { name: /simpan perubahan/i })
    );

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ name: "Admin Baru" })
    );
  });

  it("mengirim dua field kalau dua-duanya diubah", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    const nama = screen.getByLabelText(/^nama$/i);
    await userEvent.clear(nama);
    await userEvent.type(nama, "Admin Baru");

    const email = screen.getByLabelText(/^email$/i);
    await userEvent.clear(email);
    await userEvent.type(email, "baru@rcfprint.com");

    await userEvent.click(
      screen.getByRole("button", { name: /simpan perubahan/i })
    );

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Admin Baru",
        email: "baru@rcfprint.com",
      })
    );
  });

  it("tidak mengirim field yang diketik lalu dikembalikan ke nilai semula", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    const nama = screen.getByLabelText(/^nama$/i);
    await userEvent.type(nama, " X");

    const email = screen.getByLabelText(/^email$/i);
    await userEvent.clear(email);
    await userEvent.type(email, "baru@rcfprint.com");

    await userEvent.click(
      screen.getByRole("button", { name: /simpan perubahan/i })
    );

    // react-hook-form membandingkan dengan nilai awal, bukan hanya mencatat
    // "pernah disentuh" — jadi nama tidak ikut terkirim meski sempat diubah.
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("name");
  });

  it("tombol simpan mati sebelum ada perubahan", () => {
    renderForm();

    expect(
      screen.getByRole("button", { name: /simpan perubahan/i })
    ).toBeDisabled();
  });
});

describe("EditProfileForm — validasi", () => {
  it("menolak nama yang dikosongkan tanpa memanggil onSubmit", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await userEvent.clear(screen.getByLabelText(/^nama$/i));
    await userEvent.click(
      screen.getByRole("button", { name: /simpan perubahan/i })
    );

    expect(await screen.findByText(/nama wajib diisi/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("menolak format email yang salah", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    const email = screen.getByLabelText(/^email$/i);
    await userEvent.clear(email);
    await userEvent.type(email, "bukan-email");
    await userEvent.click(
      screen.getByRole("button", { name: /simpan perubahan/i })
    );

    expect(
      await screen.findByText(/format email tidak valid/i)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("menolak username dengan karakter yang tidak diizinkan", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    const username = screen.getByLabelText(/^username$/i);
    await userEvent.clear(username);
    await userEvent.type(username, "admin baru!");
    await userEvent.click(
      screen.getByRole("button", { name: /simpan perubahan/i })
    );

    expect(
      await screen.findByText(/username hanya boleh/i)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("menghubungkan error ke input lewat aria-invalid", async () => {
    renderForm();

    await userEvent.clear(screen.getByLabelText(/^nama$/i));
    await userEvent.click(
      screen.getByRole("button", { name: /simpan perubahan/i })
    );
    await screen.findByText(/nama wajib diisi/i);

    expect(screen.getByLabelText(/^nama$/i)).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });

  it("menghapus error setelah field diperbaiki", async () => {
    renderForm();

    await userEvent.clear(screen.getByLabelText(/^nama$/i));
    await userEvent.click(
      screen.getByRole("button", { name: /simpan perubahan/i })
    );
    await screen.findByText(/nama wajib diisi/i);

    await userEvent.type(screen.getByLabelText(/^nama$/i), "Admin Baru");

    await waitFor(() =>
      expect(screen.queryByText(/nama wajib diisi/i)).not.toBeInTheDocument()
    );
  });
});

describe("EditProfileForm — tombol batal dan status", () => {
  it("batal mengembalikan nilai form ke data user", async () => {
    renderForm();

    const input = screen.getByLabelText(/^nama$/i);
    await userEvent.clear(input);
    await userEvent.type(input, "Nama Salah");

    await userEvent.click(screen.getByRole("button", { name: /^batal$/i }));

    expect(screen.getByLabelText(/^nama$/i)).toHaveValue("Admin RCF");
    expect(screen.getByRole("button", { name: /^batal$/i })).toBeDisabled();
  });

  it("batal mati kalau belum ada perubahan", () => {
    renderForm();

    expect(screen.getByRole("button", { name: /^batal$/i })).toBeDisabled();
  });

  it("kedua tombol mati saat isSubmitting", async () => {
    const { rerenderDengan } = renderForm();

    const input = screen.getByLabelText(/^nama$/i);
    await userEvent.clear(input);
    await userEvent.type(input, "Admin Baru");

    rerenderDengan({ isSubmitting: true });

    expect(screen.getByRole("button", { name: /menyimpan/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^batal$/i })).toBeDisabled();
  });

  it("menampilkan pesan error server beserta detailnya", () => {
    renderForm({
      errorMessage: "Username sudah digunakan",
      errorDetails: ["username sudah digunakan"],
    });

    expect(screen.getByText("Username sudah digunakan")).toBeInTheDocument();
    expect(screen.getByText("username sudah digunakan")).toBeInTheDocument();
  });

  it("tidak mengosongkan isian saat error server muncul", async () => {
    const { rerenderDengan } = renderForm();

    const username = screen.getByLabelText(/^username$/i);
    await userEvent.clear(username);
    await userEvent.type(username, "adminbaru");

    rerenderDengan({ errorMessage: "Username sudah digunakan" });

    // Form tidak di-unmount, dan prop user tidak berubah, jadi isian
    // yang gagal disimpan harus tetap ada untuk diperbaiki.
    expect(screen.getByLabelText(/^username$/i)).toHaveValue("adminbaru");
  });

  it("menyembunyikan pesan sukses kalau ada error", () => {
    renderForm({
      successMessage: "Profil berhasil diperbarui",
      errorMessage: "Username sudah digunakan",
    });

    expect(
      screen.queryByText("Profil berhasil diperbarui")
    ).not.toBeInTheDocument();
  });

  it("menampilkan pesan sukses saat tidak ada error", () => {
    renderForm({ successMessage: "Profil berhasil diperbarui" });

    expect(screen.getByText("Profil berhasil diperbarui")).toBeInTheDocument();
  });
});
