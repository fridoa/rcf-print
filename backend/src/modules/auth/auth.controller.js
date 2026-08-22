import authService from "./auth.service.js";
import {
  loginSchema,
  editProfileSchema,
  changePasswordSchema,
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

export default { login, me, editProfile, changePassword };
