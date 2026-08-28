import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextField } from "@/shared/components/ui";
import { renderPlain } from "@/test/renderWithProviders";

/**
 * Tombol eye hanya untuk type="password" — otomatis di semua form
 * (login, ganti password, lupa katasandi) tanpa kode per-form.
 */

function PasswordField(props = {}) {
  return <TextField label="Password" type="password" {...props} />;
}

describe("TextField — toggle lihat password", () => {
  it("input password punya tombol tampilkan, input text tidak", () => {
    const { rerender } = renderPlain(<PasswordField />);
    expect(
      screen.getByRole("button", { name: /tampilkan password/i })
    ).toBeInTheDocument();

    rerender(<TextField label="Nama" type="text" />);
    expect(
      screen.queryByRole("button", { name: /tampilkan password/i })
    ).not.toBeInTheDocument();
  });

  it("klik eye -> teks terlihat (type text), klik lagi -> tersembunyi", async () => {
    renderPlain(<PasswordField />);

    const input = screen.getByLabelText(/^password$/i);
    expect(input).toHaveAttribute("type", "password");

    await userEvent.click(
      screen.getByRole("button", { name: /tampilkan password/i })
    );
    expect(input).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: /sembunyikan password/i })
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /sembunyikan password/i })
    );
    expect(input).toHaveAttribute("type", "password");
  });

  it("tombol eye tidak merusak label -> input tetap satu dan terhubung", () => {
    renderPlain(<PasswordField />);

    // getByLabelText akan throw kalau ada >1 input yang cocok dengan label
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("tombol eye bukan submit — type button, tidak ikut alur tab", () => {
    renderPlain(<PasswordField />);

    const toggle = screen.getByRole("button", { name: /tampilkan password/i });
    expect(toggle).toHaveAttribute("type", "button");
    expect(toggle).toHaveAttribute("tabindex", "-1");
  });
});
