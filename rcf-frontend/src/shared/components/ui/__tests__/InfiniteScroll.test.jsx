import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { InfiniteScroll } from "../InfiniteScroll";

/**
 * Test InfiniteScroll. IntersectionObserver di-stub di src/test/setup.js
 * sebagai no-op, jadi di sini kita fokus ke perilaku render (bukan pemicuan
 * observer, yang butuh browser sungguhan).
 */
describe("InfiniteScroll", () => {
  it("menampilkan indikator 'Memuat lagi...' saat mengambil halaman berikutnya", () => {
    render(
      <InfiniteScroll
        hasNextPage
        isFetchingNextPage
        onLoadMore={() => {}}
      />
    );
    expect(screen.getByText("Memuat lagi...")).toBeInTheDocument();
  });

  it("menampilkan teks akhir saat tidak ada halaman berikutnya", () => {
    render(
      <InfiniteScroll
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={() => {}}
        endText="Semua order sudah dimuat."
      />
    );
    expect(screen.getByText("Semua order sudah dimuat.")).toBeInTheDocument();
  });

  it("membuat IntersectionObserver saat masih ada halaman berikutnya", () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    const asli = window.IntersectionObserver;
    window.IntersectionObserver = class {
      observe = observe;
      unobserve = () => {};
      disconnect = disconnect;
      takeRecords = () => [];
    };

    const { unmount } = render(
      <InfiniteScroll
        hasNextPage
        isFetchingNextPage={false}
        onLoadMore={() => {}}
      />
    );
    expect(observe).toHaveBeenCalled();
    unmount();
    expect(disconnect).toHaveBeenCalled();

    window.IntersectionObserver = asli;
  });
});
