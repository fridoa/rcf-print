import createHttpError from "http-errors";

/**
 * Batasi akses hanya untuk role tertentu.
 * Dipakai setelah authenticate, contoh: authorize(ROLES.ADMIN)
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createHttpError(401, "Belum terautentikasi"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(createHttpError(403, "Anda tidak punya akses untuk aksi ini"));
    }

    next();
  };
};
