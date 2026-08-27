import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  CheckCircle2,
  Wallet,
  AlertTriangle,
  PackageCheck,
} from "lucide-react";
import { StatTile, DonutChart, BarList } from "@/shared/components/ui";
import { formatRupiah } from "@/shared/lib/format";
import { useOrderStatistik, STATUS, STATUS_LABEL } from "@/features/orders";
import { useAuth } from "@/features/auth";
import { ROUTES } from "@/shared/constants/routes";
import { DashboardShell, Panel } from "../components/DashboardShell";
import {
  donutAktif,
  STATUS_BAR,
} from "../constants/dashboard.constants";

/**
 * Dashboard ADMIN — pandangan menyeluruh: uang hari ini, beban operasional,
 * dan corong status supaya bottleneck kelihatan. Kartu bisa diklik menuju
 * daftar terkait.
 */
export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useOrderStatistik();

  const s = data ?? {};
  const hariIni = s.hariIni ?? {};
  const perStatus = s.perStatus ?? {};

  const donut = donutAktif(perStatus);

  // Corong: qty menunggu per langkah antrian (bar chart).
  const funnel = [
    STATUS.ANTRI_DESAIN,
    STATUS.ANTRI_CETAK,
    STATUS.ANTRI_CUTTING,
    STATUS.PACKING,
    STATUS.READY,
  ].map((st) => ({
    label: STATUS_LABEL[st] ?? st,
    value: perStatus[st]?.count ?? 0,
    color: STATUS_BAR[st],
  }));

  return (
    <DashboardShell
      nama={user?.name}
      peranLabel="operasional"
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Pendapatan hari ini"
          value={formatRupiah(hariIni.pendapatan)}
          icon={Wallet}
          tone="success"
        />
        <StatTile
          label="Selesai hari ini"
          value={hariIni.selesai ?? 0}
          sub={`${hariIni.orderBaru ?? 0} order baru masuk`}
          icon={CheckCircle2}
          tone="brand"
        />
        <StatTile
          label="Order aktif"
          value={s.aktifTotal ?? 0}
          sub="Belum selesai"
          icon={ClipboardList}
          tone="slate"
          onClick={() => navigate(ROUTES.orders)}
        />
        <StatTile
          label="Lewat deadline"
          value={s.overdue ?? 0}
          sub="Perlu perhatian"
          icon={AlertTriangle}
          tone={s.overdue > 0 ? "danger" : "slate"}
          onClick={() => navigate(ROUTES.orders)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Order aktif per status">
          <DonutChart
            data={donut}
            centerLabel={s.aktifTotal ?? 0}
            centerSub="aktif"
          />
        </Panel>

        <Panel title="Antrian per langkah">
          <BarList items={funnel} emptyText="Tidak ada order aktif." />
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <PackageCheck className="h-4 w-4" />
            {perStatus[STATUS.READY]?.count ?? 0} order siap diambil pelanggan.
          </div>
        </Panel>
      </div>
    </DashboardShell>
  );
}
