import { useAuth } from "@/features/auth";
import { ROLES } from "@/shared/constants/roles";
import { AdminDashboard } from "./AdminDashboard";
import { DesignerDashboard } from "./DesignerDashboard";
import { ProduksiDashboard } from "./ProduksiDashboard";
import { PackingDashboard } from "./PackingDashboard";

/**
 * Dispatcher dashboard: pilih tampilan sesuai role user.
 *
 * Tiap role melihat ringkasan yang relevan untuk pekerjaannya (Opsi B — sama
 * pola dengan layar order per-peran). Role tak dikenal jatuh ke dashboard
 * pekerja generik yang paling netral (antrian), bukan dashboard admin.
 */
export function DashboardPage() {
  const { user } = useAuth();

  switch (user?.role) {
    case ROLES.ADMIN:
      return <AdminDashboard />;
    case ROLES.DESIGNER:
      return <DesignerDashboard />;
    case ROLES.PRODUKSI:
      return <ProduksiDashboard />;
    case ROLES.PACKING:
      return <PackingDashboard />;
    default:
      return <PackingDashboard />;
  }
}
