import authService from "./auth.service.js";
import {
  loginSchema,
  editProfileSchema,
  changePasswordSchema,
  lupaPasswordSchema,
  verifikasiOtpSchema,
  resetPasswordSchema,
} from "./auth.validator.js";

const login = async (req, res, next) => {
  try {
    const payload = await loginSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const { token, user } = await authService.login(payload);

    res.json({
      success: true,
      message: "Login berhasil",
      data: { token, user },
    });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const editProfile = async (req, res, next) => {
  try {
    const payload = await editProfileSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const user = await authService.editProfile(req.user.id, payload);

    res.json({
      success: true,
      message: "Profil berhasil diperbarui",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const payload = await changePasswordSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    await authService.changePassword(req.user.id, payload);

    res.json({
      success: true,
      message: "Password berhasil diubah",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lupa katasandi — 3 endpoint publik (tanpa authenticate):
 * permintaan reset, verifikasi OTP, dan reset password lewat token email.
 */
const lupaPassword = async (req, res, next) => {
  try {
    const payload = await lupaPasswordSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const hasil = await authService.lupaPassword(payload);

    res.json({
      success: true,
      message: hasil.message,
    });
  } catch (error) {
    next(error);
  }
};

const verifikasiOtp = async (req, res, next) => {
  try {
    const payload = await verifikasiOtpSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const hasil = await authService.verifikasiOtp(payload);

    res.json({
      success: true,
      message: "Kode OTP valid",
      data: { resetToken: hasil.resetToken },
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const payload = await resetPasswordSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    await authService.resetPassword(payload);

    res.json({
      success: true,
      message: "Password berhasil direset, silakan login",
    });
  } catch (error) {
    next(error);
  }
};

export default { login, me, editProfile, changePassword, lupaPassword, verifikasiOtp, resetPassword };
