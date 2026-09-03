import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, PhoneOutgoing, ChevronRight } from "lucide-react";
import { SelectField } from "@/shared/components/ui";
import { whatsappLink, createReadyWhatsappMessage } from "@/shared/lib/phone";
import {
  STATUS,
  STATUS_LABEL,
  JENIS_LABEL,
  StatusBadge,
  useOrderTertahan,
} from "@/features/orders";
import { ROUTES } from "@/shared/constants/routes";
import { Panel } from "./DashboardShell";

/**
 * Pilihan ambang. Dimulai dari 3 hari (nilai default) lalu melonggar — pilihan
 * di bawah default tidak berguna: admin membuka panel ini untuk menyaring lebih
 * ketat, bukan untuk melihat order yang baru dua hari diam.
 */
const OPSI_AMBANG = [
  { value: "3", label: "lebih dari 3 hari" },
  { value: "7", label: "lebih dari 7 hari" },
  { value: "14", label: "lebih dari 14 hari" },
];

/** Urutan status untuk ringkasan sumbat — mengikuti alur kerja, bukan abjad. */
const URUTAN_STATUS = [
  STATUS.ANTRI_DESAIN,
  STATUS.ANTRI_CETAK,
  STATUS.ANTRI_CUTTING,
  STATUS.ANTRI_SUBLIM,
  STATUS.PACKING,
  STATUS.READY,
];

/** Umur dalam hari bulat sejak sebuah timestamp. Minimal 0, tidak negatif. */
const umurHari = (sejak) => {
  if (!sejak) return 0;
  const ms = Date.now() - new Date(sejak).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
};

/**
 * Satu baris order tertahan: kode + pelanggan, status sekarang, dan sudah
 * berapa lama diam di situ.
 *
 * Seluruh baris bisa diklik menuju halaman order supaya target sentuh di HP
 * cukup besar; aksi WhatsApp dipisah sebagai tautan sendiri dengan
 * stopPropagation agar tidak ikut memicu navigasi.
 */
function BarisTertahan({ order, onBuka }) {
  const pelanggan = order.customer_id?.name ?? "Pelanggan";
  const hari = umurHari(order.status_sejak);
  const nomorWa = order.customer_id?.whatsapp;

  // Tombol tagih hanya untuk READY: di status lain bolanya masih di kita, jadi
  // menghubungi pelanggan bukan tindak lanjut yang benar.
  const bisaTagih = order.status === STATUS.READY && Boolean(nomorWa);

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onBuka(order)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onBuka(order);
          }
        }}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50 focus:outline focus:outline-2 focus:outline-brand-500"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">
            {order.kode_order}
            <span className="ml-2 font-normal text-slate-500">{pelanggan}</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            <span className="text-xs text-slate-500">
              {JENIS_LABEL[order.jenis] ?? order.jenis} · diam{" "}
              <span className="font-medium text-slate-700">{hari} hari</span>
            </span>
          </div>
        </div>

        {bisaTagih && (
          <a
            href={whatsappLink(nomorWa, createReadyWhatsappMessage(order))}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            <PhoneOutgoing className="size-3.5" aria-hidden="true" />
            Tagih
          </a>
        )}

        <ChevronRight
          className="size-4 shrink-0 text-slate-300"
          aria-hidden="true"
        />
      </div>
    </li>
  );
}

/**
 * Panel "Order tertahan" untuk dashboard ADMIN.
 *
 * Menjawab pertanyaan yang tidak terjawab oleh angka agregat: kalau ada order
 * lama yang belum selesai, dia berhenti DI MANA. Order bisa mengendap di
 * langkah mana pun — desain, cetak, cutting, packing — atau menganggur di READY
 * karena pelanggan belum mengambilnya, jadi panel ini tidak memfilter status.
 *
 * Umur dihitung dari status_sejak (kapan masuk status sekarang), bukan tanggal
 * order — lihat komentar di backend order.service.js#tertahan.
 */
export function OrderTertahanPanel() {
  const navigate = useNavigate();
  const [ambang, setAmbang] = useState("3");

  const { data, isLoading, isError, error } = useOrderTertahan({
    ambang_hari: Number(ambang),
  });

  // Menuju halaman Pesanan dengan kode order sebagai kata pencarian: halaman
  // itu tidak punya route detail per order, dan mengirim kode ke filter search
  // membuat order yang diklik langsung jadi satu-satunya baris di tabel.
  const bukaOrder = (order) =>
    navigate(`${ROUTES.orders}?search=${encodeURIComponent(order.kode_order)}`);

  const total = data?.total ?? 0;
  const perStatus = data?.per_status ?? {};

  // Hanya status yang benar-benar punya order tertahan; menampilkan "0" untuk
  // langkah yang bersih cuma menambah angka yang harus diabaikan mata.
  const sumbat = URUTAN_STATUS.filter((s) => (perStatus[s] ?? 0) > 0);

  const pemilihAmbang = (
    <SelectField
      className="w-44"
      label="Ambang umur"
      hideLabel
      options={OPSI_AMBANG}
      value={ambang}
      onChange={(e) => setAmbang(e.target.value)}
    />
  );

  return (
    <Panel title="Order tertahan" action={pemilihAmbang}>
      {isLoading && <p className="text-sm text-slate-500">Memeriksa order…</p>}

      {isError && (
        <p className="text-sm text-rose-600">
          {error?.message ?? "Gagal memeriksa order tertahan."}
        </p>
      )}

      {/* Keadaan aman diberi tampilan tegas, bukan sekadar teks kosong: admin
          perlu tahu bedanya "tidak ada masalah" dengan "panel gagal memuat". */}
      {!isLoading && !isError && total === 0 && (
        <div className="flex items-start gap-3 rounded-lg bg-emerald-50 px-3 py-3">
          <ShieldCheck
            className="mt-0.5 size-5 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium text-emerald-800">
              Semua order aman.
            </p>
            <p className="mt-0.5 text-xs text-emerald-700">
              Tidak ada order yang diam lebih dari {data?.ambang_hari ?? ambang}{" "}
              hari di satu langkah. Antrian jalan dan tidak ada pesanan siap yang
              menganggur.
            </p>
          </div>
        </div>
      )}

      {!isLoading && !isError && total > 0 && (
        <div className="flex flex-col gap-3">
          {/* Ringkasan sumbat: langkah mana yang menahan berapa order. Ini yang
              menjawab "kenapa" secara ringkas sebelum admin membaca baris. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span className="font-medium text-slate-700">
              {total} order diam lebih dari {data.ambang_hari} hari:
            </span>
            {sumbat.map((s) => (
              <span key={s}>
                {STATUS_LABEL[s] ?? s}{" "}
                <span className="font-semibold text-slate-800">
                  {perStatus[s]}
                </span>
              </span>
            ))}
          </div>

          <ul className="flex flex-col gap-0.5">
            {data.items.map((order) => (
              <BarisTertahan
                key={order._id}
                order={order}
                onBuka={bukaOrder}
              />
            ))}
          </ul>

          {total > data.items.length && (
            <p className="ml-2 text-xs text-slate-500">
              +{total - data.items.length} order lain tidak ditampilkan.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
