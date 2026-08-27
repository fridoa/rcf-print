import mongoose, { Schema } from "mongoose";

/**
 * Counter penomoran order harian per jenis.
 *
 * _id berupa string "<PREFIX>-<DDMMYY>" (mis. "DTF-220826") supaya satu
 * dokumen counter mewakili tepat satu hari + satu jenis. Nomor urut diambil
 * dengan findOneAndUpdate + $inc yang atomik di sisi MongoDB — dua admin yang
 * membuat order bersamaan tidak akan pernah mendapat seq yang sama.
 *
 * Dokumen ini bukan data bisnis yang dibaca layar mana pun; ia murni state
 * penomoran. Karena itu tidak ada timestamps dan tidak ada toJSON khusus.
 */
const counterSchema = new Schema(
  {
    _id: { type: String }, // "DTF-220826"
    jenis: { type: String, required: true },
    tanggal: { type: String, required: true }, // DDMMYY
    seq: { type: Number, required: true, default: 0 },
  },
  { _id: false, versionKey: false }
);

const CounterModel = mongoose.model("Counter", counterSchema);

export default CounterModel;
