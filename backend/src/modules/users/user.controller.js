import userService from "./user.service.js";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  listUserQuerySchema,
} from "./user.validator.js";

const list = async (req, res, next) => {
  try {
    const query = await listUserQuerySchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    const { items, pagination } = await userService.list(query);

    res.json({
      success: true,
      data: items,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

const detail = async (req, res, next) => {
  try {
    const user = await userService.getOne(req.params.id);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const payload = await createUserSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const user = await userService.create(payload);

    res.status(201).json({
      success: true,
      message: "User berhasil ditambahkan",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const payload = await updateUserSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    // req.user.id (dari token) diteruskan supaya service bisa menolak
    // aksi berbahaya terhadap diri sendiri.
    const user = await userService.update(req.params.id, req.user.id, payload);

    res.json({
      success: true,
      message: "Data user berhasil diperbarui",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = await resetPasswordSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    await userService.resetPassword(req.params.id, newPassword);

    res.json({
      success: true,
      message: "Password user berhasil direset",
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await userService.remove(req.params.id, req.user.id);

    res.json({
      success: true,
      message: "User berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};

export default { list, detail, create, update, resetPassword, remove };
