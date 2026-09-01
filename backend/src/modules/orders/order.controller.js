import orderService from "./order.service.js";
import {
  createOrderSchema,
  updateOrderSchema,
  listOrderQuerySchema,
  majukanStatusSchema,
  selesaikanOrderSchema,
  koreksiStatusSchema,
} from "./order.validator.js";

const list = async (req, res, next) => {
  try {
    // FE mengirim status berulang (?status=ANTRI_CETAK&status=PACKING) untuk
    // layar produksi; express menampungnya sebagai array. Schema memisahkan
    // status (tunggal) dan statusIn (banyak), jadi bentuk array dipindahkan ke
    // statusIn di sini — kalau tidak, Yup menolaknya sebagai string invalid.
    const rawQuery = { ...req.query };
    if (Array.isArray(rawQuery.status)) {
      rawQuery.statusIn = rawQuery.status;
      delete rawQuery.status;
    }

    const query = await listOrderQuerySchema.validate(rawQuery, {
      abortEarly: false,
      stripUnknown: true,
    });

    const { items, pagination } = await orderService.list(query);

    res.json({ success: true, data: items, pagination });
  } catch (error) {
    next(error);
  }
};

const detail = async (req, res, next) => {
  try {
    const order = await orderService.getById(req.params.id);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

const riwayat = async (req, res, next) => {
  try {
    const logs = await orderService.getRiwayat(req.params.id);
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

const statistik = async (req, res, next) => {
  try {
    const data = await orderService.statistik();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const payload = await createOrderSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    // created_by diambil dari token, tidak pernah dari body.
    const order = await orderService.create({
      ...payload,
      created_by: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Order berhasil dibuat",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const majukanStatus = async (req, res, next) => {
  try {
    const payload = await majukanStatusSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const order = await orderService.majukanStatus(
      req.params.id,
      req.user,
      payload
    );

    res.json({
      success: true,
      message: `Status order menjadi ${order.status}`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const selesaikan = async (req, res, next) => {
  try {
    const payload = await selesaikanOrderSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const order = await orderService.selesaikan(
      req.params.id,
      req.user,
      payload
    );

    res.json({
      success: true,
      message: "Order selesai dan pembayaran tercatat",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const koreksi = async (req, res, next) => {
  try {
    const payload = await koreksiStatusSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const order = await orderService.koreksiStatus(
      req.params.id,
      req.user,
      payload
    );

    res.json({
      success: true,
      message: `Status order dikoreksi menjadi ${order.status}`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const payload = await updateOrderSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const order = await orderService.update(
      req.params.id,
      req.user,
      payload
    );

    res.json({
      success: true,
      message: "Data order berhasil diperbarui",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await orderService.remove(req.params.id);
    res.json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  list,
  detail,
  riwayat,
  statistik,
  create,
  update,
  remove,
  majukanStatus,
  selesaikan,
  koreksi,
};

