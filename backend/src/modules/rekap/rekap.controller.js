import rekapService from "./rekap.service.js";
import { rekapQuerySchema } from "./rekap.validator.js";

/**
 * GET /rekap/harian — rekap pemasukan harian order SELESAI.
 * Query: ?dari=YYYY-MM-DD&sampai=YYYY-MM-DD (opsional, default bulan berjalan).
 */
const harian = async (req, res, next) => {
  try {
    const query = await rekapQuerySchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    const hasil = await rekapService.rekapHarian(query);

    res.json({ success: true, data: hasil });
  } catch (error) {
    next(error);
  }
};

export default { harian };
