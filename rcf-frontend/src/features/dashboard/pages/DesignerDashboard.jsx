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
          status: STATUS.ANTRI_CETAK,
          label: "Diteruskan (cetak/cutting)",
          sub: "Sudah lepas dari desain",
          icon: Send,
          tone: "brand",
          color: STATUS_HEX[STATUS.ANTRI_CETAK],
        },
      ]}
    />
  );
}
