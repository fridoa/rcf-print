import mongoose, { Schema } from "mongoose";
import { STATUS_LIST } from "./order.constant.js";

/**
 * Catatan audit tiap perubahan status order.
 *
 * Menyimpan status_dari (bisa null untuk pembuatan order) supaya koreksi/
 * mundur yang dilakukan ADMIN bisa ditelusuri: siapa mengubah dari status apa
 * ke status apa, kapan, dan kenapa (catatan).
 */
const statusLogSchema = new Schema(
  {
    order_id: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    status_dari: {
      type: String,
      enum: [...STATUS_LIST, null],
      default: null, // null = event pembuatan order
    },
    status_ke: {
      type: String,
      required: true,
      enum: STATUS_LIST,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    catatan: {
      type: String,
      trim: true,
      maxlength: [300, "Catatan maksimal 300 karakter"],
      default: "",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

statusLogSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const StatusLogModel = mongoose.model("StatusLog", statusLogSchema);

export default StatusLogModel;
