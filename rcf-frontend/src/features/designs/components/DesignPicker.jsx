import { useRef, useState } from "react";
import { Pagination, Spinner, TextField } from "@/shared/components/ui";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { cn } from "@/shared/lib/cn";
import { useDesigns } from "../hooks/useDesigns";
import { useUploadDesign } from "../hooks/useDesignMutations";

/**
 * Pemilih desain dari galeri seorang pelanggan (multi-select) + upload baru.
 *
 * Galeri bersifat per-pelanggan (backend: {customer_id, hash} unik). Komponen
 * ini hanya aktif kalau `customerId` sudah ada — di form order, pelanggan
 * dipilih/dibuat lebih dulu, baru galerinya muncul.
 *
 * Props:
 *   - customerId : galeri milik siapa (wajib supaya galeri termuat)
 *   - value      : array id desain yang sedang terpilih
 *   - onChange(ids) : lapor perubahan pilihan ke atas
 *   - error      : pesan error dari validasi form
 *
 * Dedup ditangani backend: mengunggah file byte-identik mengembalikan desain
 * lama (200). Setelah upload (baru maupun dedup), desainnya langsung ikut
 * terpilih supaya admin tak perlu mencentang lagi.
 */
export function DesignPicker({ customerId, value = [], onChange, error }) {
  const inputRef = useRef(null);
  const [uploadError, setUploadError] = useState("");
  // Galeri bisa panjang untuk pelanggan langganan — paginasi + area scroll
  // ber-tinggi tetap biar form tidak memanjang tak terkendali (12 per halaman
  // ≈ 3 baris grid, pas dalam modal tanpa mendorong tombol keluar layar).
  const [page, setPage] = useState(1);
  const limit = 12;

  // Pencarian label/nama file: ketikan di-debounce supaya tidak memanggil API
  // tiap huruf. Ganti kata kunci → balik ke halaman 1 (hasil filter beda).
  const [inputCari, setInputCari] = useState("");
  const search = useDebouncedValue(inputCari);

  const gantiCari = (nilai) => {
    setInputCari(nilai);
    setPage(1);
  };

  const { data, isLoading, isFetching } = useDesigns(customerId, {
    search,
    page,
    limit,
  });
  const uploadMutation = useUploadDesign();

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const terpilih = new Set(value);

  const toggle = (id) => {
    const next = new Set(terpilih);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const pilihFile = () => {
    setUploadError("");
    inputRef.current?.click();
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    // Reset value input supaya memilih file yang sama lagi tetap memicu change.
    e.target.value = "";
    if (!file) return;

    setUploadError("");
    uploadMutation.mutate(
      { file, customer_id: customerId },
      {
        onSuccess: ({ design }) => {
          // Desain baru / hasil dedup langsung ikut terpilih (tanpa dobel).
          if (!terpilih.has(design._id)) onChange([...value, design._id]);
        },
        onError: (err) =>
          setUploadError(err?.message ?? "Gagal mengunggah desain"),
      }
    );
  };

  // Belum ada pelanggan: galeri tidak bisa dimuat. Beri panduan, jangan error.
  if (!customerId) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">Desain</span>
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500">
          Pilih pelanggan dulu untuk melihat galeri desainnya.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          Desain <span className="text-slate-400">(pilih minimal 1)</span>
        </span>
        <button
          type="button"
          onClick={pilihFile}
          disabled={uploadMutation.isPending}
          className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-60"
        >
          {uploadMutation.isPending ? "Mengunggah..." : "+ Upload desain baru"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={onFileChange}
          aria-label="Upload desain baru"
        />
      </div>

      {/* Kotak pencarian: hanya muncul kalau galeri memang berisi (atau sedang
          mencari), supaya galeri kosong tidak dipenuhi kontrol sia-sia. */}
      {(search || (pagination && pagination.total > 0)) && (
        <TextField
          label=""
          type="search"
          placeholder="Cari desain (label / nama file)"
          value={inputCari}
          onChange={(e) => gantiCari(e.target.value)}
          aria-label="Cari desain"
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner label="Memuat galeri desain..." />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500">
          {search
            ? `Tidak ada desain yang cocok dengan "${search}".`
            : "Galeri pelanggan ini masih kosong. Upload desain baru untuk memulai."}
        </p>
      ) : (
        <ul className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
          {items.map((d) => {
            const aktif = terpilih.has(d._id);
            return (
              <li key={d._id}>
                <button
                  type="button"
                  onClick={() => toggle(d._id)}
                  aria-pressed={aktif}
                  title={d.label || d.original_name}
                  className={cn(
                    "group relative block w-full overflow-hidden rounded-lg border-2 bg-white",
                    aktif
                      ? "border-brand-500 ring-2 ring-brand-200"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <img
                    src={d.thumbnail_url || d.url}
                    alt={d.label || d.original_name || "Desain"}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  {aktif && (
                    <span className="absolute right-1 top-1 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      ✓
                    </span>
                  )}
                  {(d.label || d.original_name) && (
                    <span className="block truncate px-1.5 py-1 text-left text-[11px] text-slate-600">
                      {d.label || d.original_name}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {pagination && pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          disabled={isFetching}
        />
      )}

      {isFetching && !isLoading && (
        <p className="text-xs text-slate-400">Memperbarui galeri...</p>
      )}

      {value.length > 0 && (
        <p className="text-xs text-slate-500">{value.length} desain terpilih.</p>
      )}

      {(uploadError || error) && (
        <p role="alert" className="text-xs text-danger-600">
          {uploadError || error}
        </p>
      )}
    </div>
  );
}
