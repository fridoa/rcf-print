import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderReadyWhatsappDialog } from "../components/OrderReadyWhatsappDialog";

const MOCK_ORDER = {
  _id: "o1",
  kode_order: "DTF/260829/001",
  jenis: "DTF",
  total_qty: 45,
  customer_id: {
    name: "Budi Santoso",
    whatsapp: "6281234567890",
  },
};

describe("OrderReadyWhatsappDialog", () => {
  it("merender informasi order dan pratinjau pesan WhatsApp", () => {
    render(
      <OrderReadyWhatsappDialog
        open={true}
        order={MOCK_ORDER}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Order Siap Diambil! 🎉")).toBeInTheDocument();
    expect(screen.getByText("DTF/260829/001")).toBeInTheDocument();
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("0812-3456-7890")).toBeInTheDocument();
    expect(screen.getByText("45 pcs")).toBeInTheDocument();

    const waLink = screen.getByRole("link", {
      name: /kirim pesan whatsapp/i,
    });
    expect(waLink).toHaveAttribute("target", "_blank");
    expect(waLink.getAttribute("href")).toContain(
      "https://wa.me/6281234567890?text="
    );
  });

  it("memanggil onClose saat tombol Nanti Saja diklik", async () => {
    const handleClose = vi.fn();
    render(
      <OrderReadyWhatsappDialog
        open={true}
        order={MOCK_ORDER}
        onClose={handleClose}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /nanti saja/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("tidak merender apa-apa saat order bernilai null", () => {
    const { container } = render(
      <OrderReadyWhatsappDialog open={true} order={null} onClose={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
