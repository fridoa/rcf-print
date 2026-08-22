import authService from "./auth.service.js";
import { loginSchema } from "./auth.validator.js";

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

export default { login, me };
