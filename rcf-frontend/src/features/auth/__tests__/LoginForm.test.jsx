import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/features/auth";
import { renderPlain } from "@/test/renderWithProviders";

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
