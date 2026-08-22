import mongoose, { Schema } from "mongoose";
import { ROLE_LIST, ROLES } from "./auth.constant.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Nama wajib diisi"],
      trim: true,
    },
    username: {
      type: String,
      required: [true, "Username wajib diisi"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, "Email wajib diisi"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password wajib diisi"],
      // jangan ikut terbawa saat query biasa
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ROLE_LIST,
        message: "Role harus salah satu dari: " + ROLE_LIST.join(", "),
      },
      required: [true, "Role wajib diisi"],
      default: ROLES.ADMIN,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await hashPassword(this.password);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = function (plain) {
  return verifyPassword(plain, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
