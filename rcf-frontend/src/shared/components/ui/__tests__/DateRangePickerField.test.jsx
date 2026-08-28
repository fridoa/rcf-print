import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateRangePickerField } from "@/shared/components/ui";
import { renderPlain } from "@/test/renderWithProviders";

/**
 * DateRangePickerField — popover kalender range (react-day-picker v10).
 * Value tetap string "YYYY-MM-DD" supaya pemanggil (RekapPage) tidak
 * berubah kontraknya.
 */

function renderField(props = {}) {
  return renderPlain(
    <DateRangePickerField
      dari="2026-08-01"
      sampai="2026-08-28"
      onChange={vi.fn()}
      {...props}
    />
  );
}

const bukaKalender = async () => {
  await userEvent.click(screen.getByRole("button", { name: /agu/i }));
  return screen.findByRole("dialog", { name: /rentang tanggal/i });
};

describe("DateRangePickerField", () => {
  it("menampilkan rentang terpilih di tombol, popover tertutup default", () => {
    renderField();

    const tombol = screen.getByRole("button", { name: /1 agu.*28 agu/i });
    expect(tombol).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("klik tombol membuka kalender; aria-expanded mengikuti", async () => {
    renderField();

    await bukaKalender();

    // nama "agu" juga cocok ke tombol navigasi bulan kalender — pakai
    // nama tombol pembuka yang spesifik (rentang).
    expect(
      screen.getByRole("button", { name: /1 agu.*28 agu/i })
    ).toHaveAttribute("aria-expanded", "true");
    // grid kalender ter-render dengan aria label bulan
    expect(document.querySelector("[data-day='2026-08-15']")).toBeTruthy();
  });

  it("klik di luar popover menutupnya", async () => {
    renderField();

    await bukaKalender();
    await userEvent.click(document.body);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Escape menutup popover dan fokus kembali ke tombol", async () => {
    renderField();

    await bukaKalender();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /1 agu.*28 agu/i })).toHaveFocus();
  });

  it("memilih dua tanggal memanggil onChange dengan rentang baru", async () => {
    const onChange = vi.fn();
    renderField({ onChange });

    await bukaKalender();
    // klik 5 lalu 25: smart range menggeser ujung terdekat dari default 1-28
    await userEvent.click(
      document.querySelector("[data-day='2026-08-05'] button")
    );
    await userEvent.click(
      document.querySelector("[data-day='2026-08-25'] button")
    );

    const terakhir = onChange.mock.calls.at(-1)[0];
    expect(terakhir).toEqual({ dari: "2026-08-01", sampai: "2026-08-25" });
  });

  it("Reset mengosongkan rentang", async () => {
    const onChange = vi.fn();
    renderField({ onChange });

    await bukaKalender();
    await userEvent.click(screen.getByRole("button", { name: /reset/i }));

    expect(onChange).toHaveBeenCalledWith({ dari: "", sampai: "" });
  });
});

describe("DateRangePickerField — dropdown tahun & bulan", () => {
  it("caption memakai dropdown: ada combobox bulan dan tahun", async () => {
    renderField();

    await bukaKalender();

    // captionLayout="dropdown" merender dua select (bulan, tahun)
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(2);

    // tahun berjalan ada di opsi tahun
    const tahun = comboboxes.find((c) =>
      [...c.options].some((o) => o.value === "2026")
    );
    expect(tahun).toBeTruthy();
  });

  it("bisa lompat tahun lewat dropdown", async () => {
    const onChange = vi.fn();
    renderField({ onChange });

    await bukaKalender();

    const pilihTahun = screen.getAllByRole("combobox").find((c) =>
      [...c.options].some((o) => o.value === "2024")
    );
    await userEvent.selectOptions(pilihTahun, "2024");

    // grid berganti ke 2024 — tanggal Agustus 2024 sekarang ada
    expect(document.querySelector("[data-day='2024-08-15']")).toBeTruthy();
  });
});
