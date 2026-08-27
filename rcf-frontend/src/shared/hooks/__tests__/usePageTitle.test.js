import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePageTitle, APP_NAME } from "../usePageTitle";

/**
 * Test hook judul tab dinamis. document.title global, jadi tiap test
 * mengembalikannya ke keadaan netral.
 */
describe("usePageTitle", () => {
  afterEach(() => {
    document.title = "";
  });

  it("menyusun 'RCF Print - <halaman>' saat page diisi", () => {
    renderHook(() => usePageTitle("Dashboard"));
    expect(document.title).toBe(`${APP_NAME} - Dashboard`);
  });

  it("memakai APP_NAME saja saat page kosong", () => {
    renderHook(() => usePageTitle());
    expect(document.title).toBe(APP_NAME);
  });

  it("mengembalikan judul ke APP_NAME saat unmount", () => {
    const { unmount } = renderHook(() => usePageTitle("Rekap"));
    expect(document.title).toBe(`${APP_NAME} - Rekap`);
    unmount();
    expect(document.title).toBe(APP_NAME);
  });
});
