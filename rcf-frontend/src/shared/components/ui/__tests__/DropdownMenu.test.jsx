import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuDivider,
} from "../DropdownMenu";

describe("DropdownMenu", () => {
  it("membuka menu saat tombol titik tiga diklik", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuItem onClick={vi.fn()}>Detail</DropdownMenuItem>
        <DropdownMenuDivider />
        <DropdownMenuItem tone="danger" onClick={vi.fn()}>
          Hapus
        </DropdownMenuItem>
      </DropdownMenu>
    );

    // Awalnya menu tertutup
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Klik tombol titik tiga
    const trigger = screen.getByRole("button", { name: /menu aksi/i });
    await userEvent.click(trigger);

    // Menu terbuka
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /detail/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /hapus/i })).toBeInTheDocument();
  });

  it("menjalankan callback dan menutup menu saat item diklik", async () => {
    const handleDetail = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuItem onClick={handleDetail}>Detail</DropdownMenuItem>
      </DropdownMenu>
    );

    await userEvent.click(screen.getByRole("button", { name: /menu aksi/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /detail/i }));

    expect(handleDetail).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("menutup menu saat menekan tombol Escape", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuItem onClick={vi.fn()}>Detail</DropdownMenuItem>
      </DropdownMenu>
    );

    await userEvent.click(screen.getByRole("button", { name: /menu aksi/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
