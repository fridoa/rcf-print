import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/features/auth";
import { renderPlain } from "@/test/renderWithProviders";
import { MemoryRouter } from "react-router-dom";

describe("LoginForm", () => {
  it("menampilkan pesan wajib isi kalau form disubmit kosong", async () => {
    const onSubmit = vi.fn();
    renderPlain(<LoginForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: /masuk/i }));

    expect(
      await screen.findByText("Username atau email wajib diisi")
    ).toBeInTheDocument();
    expect(screen.getByText("Password wajib diisi")).toBeInTheDocument();

    // Yang penting: submit tidak diteruskan ke server saat form invalid.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("meneruskan identifier dan password saat form valid", async () => {
    const onSubmit = vi.fn();
    renderPlain(<LoginForm onSubmit={onSubmit} />);

    await userEvent.type(
      screen.getByLabelText(/username atau email/i),
      "admin"
    );
    await userEvent.type(screen.getByLabelText(/^password$/i), "rahasia123");
    await userEvent.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      identifier: "admin",
      password: "rahasia123",
    });
  });

  it("men-trim spasi di identifier tapi tidak di password", async () => {
    const onSubmit = vi.fn();
    renderPlain(<LoginForm onSubmit={onSubmit} />);

    await userEvent.type(
      screen.getByLabelText(/username atau email/i),
      "  admin  "
    );
    await userEvent.type(screen.getByLabelText(/^password$/i), " rahasia123 ");
    await userEvent.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].identifier).toBe("admin");
    // Password tidak di-trim: spasi bisa jadi bagian password yang sah.
    expect(onSubmit.mock.calls[0][0].password).toBe(" rahasia123 ");
  });

  it("menampilkan pesan error dari server", () => {
    renderPlain(
      <LoginForm
        onSubmit={vi.fn()}
        errorMessage="Username/email atau password salah"
      />
    );

    expect(
      screen.getByText("Username/email atau password salah")
    ).toBeInTheDocument();
  });

  it("menonaktifkan tombol saat sedang submit", () => {
    renderPlain(<LoginForm onSubmit={vi.fn()} isSubmitting />);

    const tombol = screen.getByRole("button", { name: /masuk/i });
    expect(tombol).toBeDisabled();
    expect(tombol).toHaveAttribute("aria-busy", "true");
  });

  it("memakai autocomplete yang benar supaya password manager bekerja", () => {
    renderPlain(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/username atau email/i)).toHaveAttribute(
      "autocomplete",
      "username"
    );
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute(
      "autocomplete",
      "current-password"
    );
  });

  it("menandai input yang error dengan aria-invalid", async () => {
    renderPlain(<LoginForm onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() =>
      expect(screen.getByLabelText(/username atau email/i)).toHaveAttribute(
        "aria-invalid",
        "true"
      )
    );
  });
});

/**
 * Field login dibungkus <Controller>, jadi nilainya hidup di state form
 * dan bukan lagi di DOM. Yang di bawah ini menguji akibat langsung dari
 * perubahan itu — hal yang tidak terlihat lewat test di atas.
 */
describe("LoginForm — field controlled", () => {
  it("memulai dengan string kosong, bukan undefined", () => {
    renderPlain(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/username atau email/i)).toHaveValue("");
    expect(screen.getByLabelText(/^password$/i)).toHaveValue("");
  });

  it("tidak memunculkan peringatan controlled/uncontrolled dari React", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderPlain(<LoginForm onSubmit={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/username atau email/i), "admin");

    const pesan = spy.mock.calls.flat().join(" ");
    expect(pesan).not.toMatch(/uncontrolled input to be controlled/i);

    spy.mockRestore();
  });

  it("menampilkan apa yang diketik (onChange tersambung ke state)", async () => {
    renderPlain(<LoginForm onSubmit={vi.fn()} />);

    const input = screen.getByLabelText(/username atau email/i);
    await userEvent.type(input, "admin");

    expect(input).toHaveValue("admin");
  });

  it("menghapus error setelah field diperbaiki", async () => {
    renderPlain(<LoginForm onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /masuk/i }));
    await screen.findByText("Username atau email wajib diisi");

    await userEvent.type(screen.getByLabelText(/username atau email/i), "admin");

    await waitFor(() =>
      expect(
        screen.queryByText("Username atau email wajib diisi")
      ).not.toBeInTheDocument()
    );
  });

  it("tidak mengosongkan isian saat pesan error server muncul", async () => {
    const bungkus = (props) => (
      <MemoryRouter initialEntries={["/"]}>
        <LoginForm onSubmit={vi.fn()} {...props} />
      </MemoryRouter>
    );
    const { rerender } = render(bungkus({}));

    await userEvent.type(screen.getByLabelText(/username atau email/i), "admin");
    await userEvent.type(screen.getByLabelText(/^password$/i), "salah");

    // Setelah 401, LoginPage merender ulang form dengan errorMessage terisi.
    // Form tidak di-unmount, jadi isian harus tetap ada — user cukup
    // memperbaiki passwordnya, tidak mengetik ulang username.
    // rerender harus dengan pembungkus yang SAMA (MemoryRouter). Kalau
    // LoginForm diberi telanjang, root tree berubah jenis dan React
    // meng-unmount semuanya — isian hilang karena remount, bukan karena
    // form-nya membersihkan state.
    rerender(
      bungkus({ errorMessage: "Username/email atau password salah" })
    );

    expect(screen.getByLabelText(/username atau email/i)).toHaveValue("admin");
    expect(screen.getByLabelText(/^password$/i)).toHaveValue("salah");
  });

  it("input password tetap bertipe password", () => {
    renderPlain(<LoginForm onSubmit={vi.fn()} />);

    // Regresi yang mudah terjadi saat menyalin prop ke Controller:
    // `type` ikut hilang dan password tampil sebagai teks biasa.
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute(
      "type",
      "password"
    );
  });
});
