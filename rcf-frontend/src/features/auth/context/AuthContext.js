import { createContext } from "react";

/**
 * Context auth dipisah dari providernya supaya file provider bisa
 * ikut aturan react-refresh (satu file = satu jenis export).
 *
 * Nilai default null dipakai sebagai penanda "dipakai di luar provider" —
 * useAuth yang melempar errornya.
 */
export const AuthContext = createContext(null);
