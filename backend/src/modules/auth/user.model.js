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

    // === Lupa password ===
    // Hanya HASH yang disimpan; nilai mentah (OTP/token) hanya dikirim ke
    // email user. Kelengkapan keduanya dicek bersama: ada hash OTP berarti
    // permintaan reset sedang berjalan.
    // Semua field di bawah TANPA default:null — field harus absen (bukan
    // null) supaya sparse unique index reset_token_hash melewatkan user
    // yang tidak punya token aktif. default:null membuat semua user punya
    // reset_token_hash:null -> E11000 dup key { null }.
    otp_hash: {
      type: String,
      select: false,
    },
    otp_expires_at: {
      type: Date,
      select: false,
    },
    reset_token_hash: {
      type: String,
      select: false,
      // single-use: token lama hangus begitu yang baru dibuat
      index: { unique: true, sparse: true },
    },
    reset_token_expires_at: {
      type: Date,
      select: false,
    },
    // Batas permintaan forgot-password per EMAIL per jam — melindungi satu
    // korban dari pemboman email lintas IP (limiter per-IP tidak menangkap
    // pola ini). Di-reset setiap jam bergulir.
    forgot_request_count: {
      type: Number,
      default: 0,
      select: false,
    },
    forgot_window_started_at: {
      type: Date,
      default: null,
      select: false,
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
