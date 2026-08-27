import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
 *
 * ToastContainer dipasang sekali di sini (global) supaya notify.* dari mana
 * pun langsung tampil. Posisi kanan-atas, autoClose 3.5 dtk, dan newestOnTop
 * supaya notifikasi terbaru tidak tertutup yang lama.
 */
const queryClient = createQueryClient();

export function Providers({ children }) {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={3500}
          newestOnTop
          pauseOnFocusLoss={false}
          theme="light"
        />
      </QueryClientProvider>
    </BrowserRouter>
  );
}
