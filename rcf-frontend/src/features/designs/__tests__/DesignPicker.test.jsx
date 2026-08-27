import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { DesignPicker } from "../components/DesignPicker";

/**
 * Test DesignPicker dengan design.api di-mock. Fokus:
 * - galeri hanya termuat kalau ada customerId
 * - memilih/deselect thumbnail melaporkan array id
 * - upload memanggil api.upload lalu ikut memilih hasilnya (termasuk dedup)
 */

vi.mock("@/features/designs/api/design.api", () => ({
  designApi: {
    list: vi.fn(),
    upload: vi.fn(),
    remove: vi.fn(),
  },
}));

const { designApi } = await import("@/features/designs/api/design.api");

const CUSTOMER_ID = "c1";

const DESIGNS = [
  {
    _id: "d1",
    customer_id: CUSTOMER_ID,
    url: "https://ik.test/d1.png",
    thumbnail_url: "https://ik.test/d1-thumb.png",
    label: "Logo depan",
    original_name: "logo.png",
  },
  {
    _id: "d2",
    customer_id: CUSTOMER_ID,
    url: "https://ik.test/d2.png",
    thumbnail_url: "https://ik.test/d2-thumb.png",
    label: "Logo belakang",
    original_name: "back.png",
  },
];

const daftar = (items) => ({
  items,
  pagination: { page: 1, limit: 50, total: items.length, totalPages: 1 },
});

// Wrapper: DesignPicker adalah controlled component, jadi test menyimpan value
// di closure lewat spy onChange dan me-render ulang dengan value terbaru.
function renderPicker({ customerId = CUSTOMER_ID, value = [], onChange } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <DesignPicker
        customerId={customerId}
        value={value}
        onChange={onChange ?? vi.fn()}
      />
    </QueryClientProvider>
  );

  const rerenderWith = (nextValue) =>
    utils.rerender(
      <QueryClientProvider client={queryClient}>
        <DesignPicker
          customerId={customerId}
          value={nextValue}
          onChange={onChange ?? vi.fn()}
        />
      </QueryClientProvider>
    );

  return { ...utils, rerenderWith };
}

describe("DesignPicker", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    designApi.list.mockResolvedValue(daftar(DESIGNS));
  });

  it("menampilkan panduan (tanpa fetch) saat belum ada pelanggan", () => {
    renderPicker({ customerId: "" });

    expect(screen.getByText(/pilih pelanggan dulu/i)).toBeInTheDocument();
    expect(designApi.list).not.toHaveBeenCalled();
  });

  it("memuat galeri pelanggan dan menampilkan thumbnail", async () => {
    renderPicker();

    expect(await screen.findByTitle("Logo depan")).toBeInTheDocument();
    expect(screen.getByTitle("Logo belakang")).toBeInTheDocument();
    expect(designApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: CUSTOMER_ID })
    );
  });

  it("melaporkan id saat thumbnail dipilih", async () => {
    const onChange = vi.fn();
    renderPicker({ onChange });

    await userEvent.click(await screen.findByTitle("Logo depan"));
    expect(onChange).toHaveBeenCalledWith(["d1"]);
  });

  it("menghapus id saat thumbnail yang sudah terpilih diklik lagi", async () => {
    const onChange = vi.fn();
    renderPicker({ value: ["d1"], onChange });

    await userEvent.click(await screen.findByTitle("Logo depan"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("upload memanggil api.upload lalu ikut memilih hasilnya", async () => {
    const baru = {
      _id: "d3",
      customer_id: CUSTOMER_ID,
      url: "https://ik.test/d3.png",
      thumbnail_url: "https://ik.test/d3-thumb.png",
      label: null,
      original_name: "new.png",
    };
    designApi.upload.mockResolvedValue({ design: baru, deduped: false });

    const onChange = vi.fn();
    renderPicker({ value: [], onChange });

    await screen.findByTitle("Logo depan");

    const file = new File(["x"], "new.png", { type: "image/png" });
    const input = screen.getByLabelText(/upload desain baru/i);
    await userEvent.upload(input, file);

    await waitFor(() =>
      expect(designApi.upload).toHaveBeenCalledWith(
        expect.objectContaining({ file, customer_id: CUSTOMER_ID })
      )
    );
    // hasil upload otomatis terpilih
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(["d3"]));
  });

  it("upload file dedup (200) tetap ikut terpilih tanpa duplikat", async () => {
    // Server mengembalikan desain lama d1 (byte-identik).
    designApi.upload.mockResolvedValue({ design: DESIGNS[0], deduped: true });

    const onChange = vi.fn();
    renderPicker({ value: [], onChange });

    await screen.findByTitle("Logo depan");

    const file = new File(["x"], "dup.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText(/upload desain baru/i), file);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(["d1"]));
  });

  it("menampilkan pesan galeri kosong", async () => {
    designApi.list.mockResolvedValue(daftar([]));
    renderPicker();

    expect(await screen.findByText(/galeri pelanggan ini masih kosong/i)).toBeInTheDocument();
  });

  it("mengetik di kotak cari memanggil list dengan param search (debounced)", async () => {
    renderPicker();
    await screen.findByTitle("Logo depan");

    await userEvent.type(screen.getByLabelText(/cari desain/i), "logo");

    // Debounce 400ms; tunggu sampai list dipanggil dengan search terisi.
    await waitFor(
      () =>
        expect(designApi.list).toHaveBeenCalledWith(
          expect.objectContaining({ customer_id: CUSTOMER_ID, search: "logo" })
        ),
      { timeout: 2000 }
    );
  });

  it("menampilkan pesan 'tidak cocok' saat pencarian nihil", async () => {
    // Muat awal berisi (supaya kotak cari tampil), lalu hasil cari kosong.
    designApi.list.mockResolvedValueOnce(daftar(DESIGNS));
    renderPicker();
    await screen.findByTitle("Logo depan");

    designApi.list.mockResolvedValue(daftar([]));
    await userEvent.type(screen.getByLabelText(/cari desain/i), "zzz");

    expect(
      await screen.findByText(/tidak ada desain yang cocok dengan "zzz"/i, undefined, {
        timeout: 2000,
      })
    ).toBeInTheDocument();
  });
});
