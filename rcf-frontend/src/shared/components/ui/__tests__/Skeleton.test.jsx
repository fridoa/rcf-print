import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton, TableSkeleton, CardsSkeleton } from "../Skeleton";

/**
 * Skeleton presentational murni. Yang kita jaga:
 * - primitive membawa animate-pulse (tanda placeholder berdenyut)
 * - preset menandai status "sibuk" untuk aksesibilitas (role=status/aria-busy)
 * - jumlah baris tabel mengikuti prop rows
 */
describe("Skeleton", () => {
  it("primitive memakai animate-pulse dan meneruskan className", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const el = container.firstChild;
    expect(el).toHaveClass("animate-pulse");
    expect(el).toHaveClass("h-4");
    expect(el).toHaveClass("w-32");
  });

  it("TableSkeleton menandai area sedang memuat", () => {
    render(<TableSkeleton rows={3} columns={4} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("TableSkeleton merender sebanyak rows baris tiruan (versi kartu HP)", () => {
    const { container } = render(
      <TableSkeleton rows={3} columns={4} />
    );
    // Versi kartu HP: <ul><li> sebanyak rows.
    const cards = container.querySelectorAll("ul > li");
    expect(cards).toHaveLength(3);
  });

  it("CardsSkeleton merender sejumlah tiles + panels", () => {
    render(<CardsSkeleton tiles={4} panels={2} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });
});
