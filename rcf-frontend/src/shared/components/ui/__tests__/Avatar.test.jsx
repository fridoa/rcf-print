import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar, inisialDari } from "@/shared/components/ui/Avatar";

/**
 * Avatar inisial: tidak ada upload gambar di aplikasi ini, jadi inisial +
 * warna deterministik yang jadi identitas visual user.
 */
describe("inisialDari", () => {
  it("dua kata -> dua huruf kapital", () => {
    expect(inisialDari("Admin RCF")).toBe("AR");
  });

  it("satu kata -> satu huruf", () => {
    expect(inisialDari("budi")).toBe("B");
  });

  it("lebih dari dua kata -> hanya dua kata pertama", () => {
    expect(inisialDari("Admin RCF Print Jaya")).toBe("AR");
  });

  it("spasi berlebih tidak menghasilkan inisial kosong", () => {
    expect(inisialDari("   Budi    Santoso  ")).toBe("BS");
  });

  it("nama kosong / undefined -> tanda tanya, bukan crash", () => {
    expect(inisialDari("")).toBe("?");
    expect(inisialDari(undefined)).toBe("?");
    expect(inisialDari(null)).toBe("?");
  });
});

describe("Avatar", () => {
  it("menampilkan inisial dan disembunyikan dari screen reader", () => {
    render(<Avatar name="Admin RCF" />);

    const el = screen.getByText("AR");
    // nama pemilik selalu ditulis di sebelahnya, jadi inisial aria-hidden
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("warna latar sama untuk nama yang sama (deterministik)", () => {
    const { unmount } = render(<Avatar name="Budi Santoso" />);
    const kelasPertama = screen.getByText("BS").className;
    unmount();

    render(<Avatar name="Budi Santoso" />);
    expect(screen.getByText("BS").className).toBe(kelasPertama);
  });

  it("ukuran lg memakai kelas ukuran yang lebih besar dari md", () => {
    const { unmount } = render(<Avatar name="Admin RCF" size="md" />);
    expect(screen.getByText("AR").className).toContain("size-12");
    unmount();

    render(<Avatar name="Admin RCF" size="lg" />);
    expect(screen.getByText("AR").className).toContain("size-20");
  });
});
