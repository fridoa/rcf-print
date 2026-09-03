import { PenTool, Send } from "lucide-react";
import { QueueDashboard } from "../components/QueueDashboard";
import { STATUS, STATUS_LABEL } from "@/features/orders";
import { ROUTES } from "@/shared/constants/routes";
import { STATUS_HEX } from "../constants/dashboard.constants";

/** Dashboard DESIGNER — fokus antrian desain. */
export function DesignerDashboard() {
  return (
    <QueueDashboard
      peranLabel="desain"
      tugas={[
        {
          status: STATUS.ANTRI_DESAIN,
          label: STATUS_LABEL[STATUS.ANTRI_DESAIN],
          sub: "Perlu dikerjakan",
          icon: PenTool,
          tone: "warning",
          route: ROUTES.desain,
          color: STATUS_HEX[STATUS.ANTRI_DESAIN],
        },
        {
          // Satu kartu untuk semua langkah produksi: setelah desain lepas,
          // designer tidak peduli order itu masuk cetak, cutting, atau sublim —
          // yang penting sudah tidak di mejanya.
          status: [
            STATUS.ANTRI_CETAK,
            STATUS.ANTRI_CUTTING,
            STATUS.ANTRI_SUBLIM,
          ],
          label: "Diteruskan ke produksi",
          sub: "Sudah lepas dari desain",
          icon: Send,
          tone: "brand",
          color: STATUS_HEX[STATUS.ANTRI_CETAK],
        },
      ]}
    />
  );
}
