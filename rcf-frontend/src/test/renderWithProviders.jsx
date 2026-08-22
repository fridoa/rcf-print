import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/features/auth";

/**
 * Helper render untuk test yang butuh router + react-query + auth.
 *
 * QueryClient dibuat baru per pemanggilan supaya cache satu test tidak
 * bocor ke test lain. retry dimatikan supaya test error tidak menunggu
 * percobaan ulang.
 */
export function renderWithProviders(
  ui,
  { route = "/", routes = [route] } = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const result = render(
    <MemoryRouter initialEntries={routes}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{ui}</AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  return { ...result, queryClient };
}

/** Versi tanpa AuthProvider, untuk test komponen presentational. */
export function renderPlain(ui, { routes = ["/"] } = {}) {
  return render(<MemoryRouter initialEntries={routes}>{ui}</MemoryRouter>);
}
