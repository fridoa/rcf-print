import { Package, PackageCheck } from "lucide-react";
import { QueueDashboard } from "../components/QueueDashboard";
import { STATUS, STATUS_LABEL } from "@/features/orders";
import { ROUTES } from "@/shared/constants/routes";
import { STATUS_HEX } from "../constants/dashboard.constants";

/** Dashboard PACKING — antrian packing + order yang sudah siap diambil. */
export function PackingDashboard() {
  return (
    <QueueDashboard
      peranLabel="packing"
      tugas={[
        {
          status: STATUS.PACKING,
          label: STATUS_LABEL[STATUS.PACKING],
          sub: "Perlu dikemas",
          icon: Package,
          tone: "warning",
          route: ROUTES.packing,
          color: STATUS_HEX[STATUS.PACKING],
        },
        {
          status: STATUS.READY,
          label: STATUS_LABEL[STATUS.READY],
          sub: "Menunggu diambil pelanggan",
          icon: PackageCheck,
          tone: "success",
          color: STATUS_HEX[STATUS.READY],
        },
      ]}
    />
  );
}
