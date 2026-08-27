import { useEffect, useRef } from "react";
import { Spinner } from "./Spinner";

/**
 * Pemicu "muat berikutnya" otomatis untuk infinite scroll.
 *
 * Merender elemen sentinel tak terlihat di bawah daftar; begitu ia masuk (atau
 * mendekati) viewport, onLoadMore dipanggil. Dipakai di HP sebagai pengganti
 * kontrol paginasi tombol.
 *
 * Presentational + pemakaian IntersectionObserver dilokalkan di sini, jadi
 * halaman cukup memberi hasNextPage/isFetchingNextPage/onLoadMore.
 *
 * rootMargin 200px: muat sedikit sebelum sentinel benar-benar terlihat supaya
 * data berikutnya sudah datang saat user sampai ke bawah (terasa mulus).
 *
 * @param {object}   props
 * @param {boolean}  props.hasNextPage        masih ada halaman berikutnya?
 * @param {boolean}  props.isFetchingNextPage sedang mengambil halaman berikutnya?
 * @param {Function} props.onLoadMore         dipanggil saat sentinel terlihat
 * @param {string}   [props.endText]          teks saat semua data sudah dimuat
 */
export function InfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  endText = "Semua data sudah dimuat.",
}) {
  const sentinelRef = useRef(null);
  // Simpan callback terbaru di ref supaya observer tidak perlu dibuat ulang
  // (dan tidak memicu load ganda) tiap kali fungsi onLoadMore berubah identitas.
  const loadMoreRef = useRef(onLoadMore);
  loadMoreRef.current = onLoadMore;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreRef.current?.();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage]);

  return (
    <div className="py-4 text-center text-sm text-slate-500">
      {isFetchingNextPage && (
        <span className="inline-flex items-center gap-2">
          <Spinner label="Memuat lagi..." />
          <span>Memuat lagi...</span>
        </span>
      )}
      {!hasNextPage && !isFetchingNextPage && <span>{endText}</span>}
      {/* Sentinel: dipantau observer. Tetap ada walau tak terlihat. */}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
    </div>
  );
}
