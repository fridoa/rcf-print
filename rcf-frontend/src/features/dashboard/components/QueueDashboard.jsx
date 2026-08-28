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
 *                nilai diambil dari perStatus[status].count.
 *   ctaLabel/ctaRoute : tombol menuju layar kerja.
 */
export function QueueDashboard({ peranLabel, tugas = [], donutItems }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useOrderStatistik();

  const perStatus = data?.perStatus ?? {};
  const totalTugas = tugas.reduce(
    (acc, t) => acc + (perStatus[t.status]?.count ?? 0),
    0
  );

  const donut = (donutItems ?? tugas).map((t) => ({
    label: t.label,
    value: perStatus[t.status]?.count ?? 0,
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
            key={t.status}
            label={t.label}
            value={perStatus[t.status]?.count ?? 0}
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
