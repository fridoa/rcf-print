/**
 * Barrel modul auth. Feature lain HANYA boleh impor dari file ini,
 * tidak menembus ke ../components/... — aturan itu yang menjaga
 * struktur per-modul tetap bisa dirapikan tanpa memburu impor liar.
 */
export { AuthProvider } from "./components/AuthProvider";
export { RequireAuth } from "./components/RequireAuth";
export { RequireRole } from "./components/RequireRole";
export { LoginForm } from "./components/LoginForm";
export { EditProfileForm } from "./components/EditProfileForm";
export { ChangePasswordForm } from "./components/ChangePasswordForm";
export { LoginPage } from "./pages/LoginPage";
export { ProfilePage } from "./pages/ProfilePage";
export { ChangePasswordPage } from "./pages/ChangePasswordPage";
export { useAuth } from "./hooks/useAuth";
export { useLogin } from "./hooks/useLogin";
export { useEditProfile } from "./hooks/useEditProfile";
export { useChangePassword } from "./hooks/useChangePassword";
export { authApi } from "./api/auth.api";
export {
  loginSchema,
  editProfileSchema,
  changePasswordSchema,
} from "./schemas/auth.schema";
