import { Printer, Scissors } from "lucide-react";
import { QueueDashboard } from "../components/QueueDashboard";
import { STATUS, STATUS_LABEL } from "@/features/orders";
import { ROUTES } from "@/shared/constants/routes";
import { STATUS_HEX } from "../constants/dashboard.constants";

/**
 * Dashboard PRODUKSI — antrian cetak (DTF) & cutting (Polyflex).
 * Satu operator produksi mengerjakan keduanya, jadi ditampilkan berdampingan.
 */
export function ProduksiDashboard() {
  return (
    <QueueDashboard
      peranLabel="produksi"
      tugas={[
        {
          status: STATUS.ANTRI_CETAK,
          label: STATUS_LABEL[STATUS.ANTRI_CETAK],
          sub: "DTF menunggu cetak",
          icon: Printer,
          tone: "brand",
          route: ROUTES.cetak,
          color: STATUS_HEX[STATUS.ANTRI_CETAK],
        },
        {
          status: STATUS.ANTRI_CUTTING,
          label: STATUS_LABEL[STATUS.ANTRI_CUTTING],
          sub: "Polyflex menunggu cutting",
          icon: Scissors,
          tone: "warning",
          route: ROUTES.polyflex,
          color: STATUS_HEX[STATUS.ANTRI_CUTTING],
        },
      ]}
    />
  );
}
