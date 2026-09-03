import { useNavigate } from "react-router-dom";
import { StatTile, DonutChart } from "@/shared/components/ui";
import { useOrderStatistik } from "@/features/orders";
import { useAuth } from "@/features/auth";
import { DashboardShell, Panel } from "../components/DashboardShell";

/**
 * Dashboard generik untuk role pekerja (Designer/Produksi/Packing).
 *
 * Ketiganya butuh hal serupa: berapa yang harus dikerjakan sekarang + donut
 * rincian antriannya. Perbedaan tiap role hanya di STATUS mana yang jadi
 * "tugas saya" dan ke halaman mana tombolnya menuju — jadi cukup satu
 * komponen berparameter, bukan tiga yang hampir sama.
 *
 * Props:
 *   peranLabel : teks sapaan ("desain", "produksi", "packing").
 *   tugas      : [{ status, label, tone, hrefRoute }] — kartu tugas utama.
 *                `status` boleh satu status atau array status; kalau array,
 *                nilainya dijumlahkan (mis. kartu "diteruskan ke produksi"
 *                yang mencakup cetak + cutting + sublim).
 *   ctaLabel/ctaRoute : tombol menuju layar kerja.
 */
export function QueueDashboard({ peranLabel, tugas = [], donutItems }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useOrderStatistik();

  const perStatus = data?.perStatus ?? {};

  // Satu kartu bisa mewakili beberapa status sekaligus. Dijumlahkan di sini
  // supaya label seperti "cetak/cutting/sublim" benar-benar cocok dengan
  // angkanya — sebelumnya kartu semacam itu hanya menghitung status pertama.
  const hitung = (status) =>
    (Array.isArray(status) ? status : [status]).reduce(
      (acc, s) => acc + (perStatus[s]?.count ?? 0),
      0
    );

  const idTugas = (t) =>
    Array.isArray(t.status) ? t.status.join("+") : t.status;

  const totalTugas = tugas.reduce((acc, t) => acc + hitung(t.status), 0);

  const donut = (donutItems ?? tugas).map((t) => ({
    label: t.label,
    value: hitung(t.status),
    color: t.color,
  }));

  return (
    <DashboardShell
      nama={user?.name}
      peranLabel={peranLabel}
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tugas.map((t) => (
          <StatTile
            key={idTugas(t)}
            label={t.label}
            value={hitung(t.status)}
            sub={t.sub}
            icon={t.icon}
            tone={t.tone ?? "brand"}
            onClick={t.route ? () => navigate(t.route) : undefined}
          />
        ))}
      </div>

      <Panel title="Rincian antrian">
        <DonutChart
          data={donut}
          centerLabel={totalTugas}
          centerSub="menunggu"
        />
      </Panel>
    </DashboardShell>
  );
}
