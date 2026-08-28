import { useEffect, useState } from "react";

/**
 * Pantau sebuah media query dan kembalikan boolean cocok/tidak.
 *
 * Dipakai untuk memilih perilaku UI berbeda antara HP dan desktop yang tidak
 * bisa diselesaikan dengan CSS saja — mis. mengganti paginasi tombol (desktop)
 * dengan infinite scroll (HP), yang perlu keputusan di level data/hook.
 *
 * Aman untuk resize: listener memperbarui state saat lebar layar melewati
 * ambang, jadi berpindah orientasi/putar layar langsung tercermin.
 */
export function useMediaQuery(query) {
  const [cocok, setCocok] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia(query);
    const handler = (e) => setCocok(e.matches);
    setCocok(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return cocok;
}

/**
 * Breakpoint desktop mengikuti `md` Tailwind (>= 768px). Di bawah itu dianggap
 * HP/tablet kecil, tempat kita memakai infinite scroll & tata letak kartu.
 */
export function useIsDesktop() {
  return useMediaQuery("(min-width: 768px)");
}
