import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/features/auth";
import { createQueryClient } from "./queryClient";

/**
 * Urutan provider penting:
 *   Router  -> supaya guard/halaman bisa pakai useNavigate
 *   Query   -> AuthProvider memakai useMutation/useQuery di bawahnya
 *   Auth    -> paling dalam, butuh keduanya
 *
 * queryClient dibuat sekali di luar komponen supaya cache tidak
 * ter-reset setiap kali Providers re-render.
 */
const queryClient = createQueryClient();

export function Providers({ children }) {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
