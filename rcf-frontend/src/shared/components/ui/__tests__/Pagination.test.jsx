import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "@/shared/components/ui";

/**
 * Pagination adalah komponen presentational murni (tak butuh router / react-
 * query / auth), jadi cukup render langsung tanpa provider.
 */
describe("Pagination", () => {
  it("tidak menampilkan apa pun saat cuma 1 halaman & tanpa pemilih limit", () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("menonaktifkan 'Sebelumnya' di halaman pertama", () => {
    render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /sebelumnya/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /berikutnya/i })).toBeEnabled();
    expect(screen.getByText(/halaman 1 dari 3/i)).toBeInTheDocument();
  });

  it("menonaktifkan 'Berikutnya' di halaman terakhir", () => {
    render(<Pagination page={3} totalPages={3} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /sebelumnya/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /berikutnya/i })).toBeDisabled();
  });

  it("memanggil onPageChange dengan halaman berikut/sebelumnya saat diklik", async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole("button", { name: /berikutnya/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await userEvent.click(screen.getByRole("button", { name: /sebelumnya/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("menonaktifkan semua tombol saat disabled=true (mis. sedang fetch)", () => {
    render(
      <Pagination page={2} totalPages={5} onPageChange={vi.fn()} disabled />
    );

    expect(screen.getByRole("button", { name: /sebelumnya/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /berikutnya/i })).toBeDisabled();
  });

  it("menampilkan teks jumlah data saat prop total diberikan", () => {
    render(
      <Pagination
        page={1}
        totalPages={4}
        total={73}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByText(/73 data/i)).toBeInTheDocument();
  });

  describe("pemilih limit", () => {
    it("tetap tampil walau cuma 1 halaman ketika onLimitChange diberikan", () => {
      render(
        <Pagination
          page={1}
          totalPages={1}
          onPageChange={vi.fn()}
          limit={20}
          onLimitChange={vi.fn()}
        />
      );
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("merender opsi limit dan menandai limit aktif sebagai terpilih", () => {
      render(
        <Pagination
          page={1}
          totalPages={2}
          onPageChange={vi.fn()}
          limit={50}
          onLimitChange={vi.fn()}
          limitOptions={[10, 20, 50, 100]}
        />
      );
      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("50");
      expect(
        screen.getAllByRole("option").map((o) => o.value)
      ).toEqual(["10", "20", "50", "100"]);
    });

    it("memanggil onLimitChange dengan nilai NUMBER saat limit diubah", async () => {
      const onLimitChange = vi.fn();
      render(
        <Pagination
          page={1}
          totalPages={2}
          onPageChange={vi.fn()}
          limit={20}
          onLimitChange={onLimitChange}
          limitOptions={[10, 20, 50]}
        />
      );

      await userEvent.selectOptions(screen.getByRole("combobox"), "50");
      expect(onLimitChange).toHaveBeenCalledWith(50);
      // Bukan string "50" — komponen wajib mengonversi ke number.
      expect(onLimitChange).not.toHaveBeenCalledWith("50");
    });

    it("menonaktifkan pemilih limit saat disabled=true", () => {
      render(
        <Pagination
          page={1}
          totalPages={2}
          onPageChange={vi.fn()}
          limit={20}
          onLimitChange={vi.fn()}
          disabled
        />
      );
      expect(screen.getByRole("combobox")).toBeDisabled();
    });
  });
});
