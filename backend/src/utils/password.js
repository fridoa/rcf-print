import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export const hashPassword = async (plain) => {
  return bcrypt.hash(plain, SALT_ROUNDS);
};

export const verifyPassword = async (plain, hashed) => {
  if (!plain || !hashed) return false;
  return bcrypt.compare(plain, hashed);
};
