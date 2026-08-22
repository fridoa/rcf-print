import UserModel from "../src/modules/auth/user.model.js";
import { ROLES } from "../src/modules/auth/auth.constant.js";

/**
 * Bikin user untuk keperluan test.
 * Password sengaja dilewatkan mentah — hashing terjadi di pre-save hook.
 */
export const buatUser = async (override = {}) => {
  const data = {
    name: "User Test",
    username: "usertest",
    email: "usertest@rcfprint.com",
    password: "rahasia123",
    role: ROLES.ADMIN,
    ...override,
  };

  const user = await UserModel.create(data);
  // kembalikan juga password mentah supaya test bisa login
  return { user, passwordMentah: data.password };
};

/** Login lewat API dan kembalikan token-nya. */
export const loginDapatToken = async (request, app, identifier, password) => {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ identifier, password });

  return res.body?.data?.token;
};
