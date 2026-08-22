import { QueryClient } from "@tanstack/react-query";

/**
 * Konfigurasi query default untuk seluruh aplikasi.
 *
 * retry: 401/403/404 tidak pernah diulang — mengulang request yang
 * ditolak karena token/izin hanya menunda pesan error ke user.
 * Error jaringan/5xx masih diulang sekali.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const status = error?.status ?? 0;
          if ([400, 401, 403, 404, 409, 422].includes(status)) return false;
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
