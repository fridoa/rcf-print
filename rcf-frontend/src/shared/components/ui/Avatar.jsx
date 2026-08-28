import { cn } from "@/shared/lib/cn";

/**
 * Avatar inisial — tanpa upload gambar (aplikasi ini tidak menyimpan foto
 * profil). Inisial diambil dari nama: dua kata pertama, maksimal 2 huruf,
 * jadi "Admin RCF Print" -> "AR" dan "budi" -> "B".
 *
 * Warna latar dipilih deterministik dari nama supaya avatar tiap orang
 * konsisten setiap kali dirender (bukan acak per-render), tapi tetap
 * berbeda antar user sehingga daftar pengguna mudah dipindai.
 *
 * aria-hidden karena nama pemiliknya selalu ditulis di sebelahnya —
 * screen reader tidak perlu membaca inisial dua kali.
 */

const WARNA = [
  "bg-brand-100 text-brand-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];

const UKURAN = {
  sm: "size-9 text-sm",
  md: "size-12 text-base",
  lg: "size-20 text-2xl",
};

/** "Admin RCF" -> "AR"; "budi" -> "B"; kosong -> "?" */
export function inisialDari(nama) {
  const kata = String(nama ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (kata.length === 0) return "?";
  if (kata.length === 1) return kata[0][0].toUpperCase();
  return (kata[0][0] + kata[1][0]).toUpperCase();
}

/** Jumlah kode karakter nama -> indeks warna. Stabil, bukan Math.random. */
function warnaDari(nama) {
  const teks = String(nama ?? "");
  let jumlah = 0;
  for (let i = 0; i < teks.length; i += 1) jumlah += teks.charCodeAt(i);
  return WARNA[jumlah % WARNA.length];
}

export function Avatar({ name, size = "md", className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold",
        UKURAN[size] ?? UKURAN.md,
        warnaDari(name),
        className
      )}
    >
      {inisialDari(name)}
    </span>
  );
}
