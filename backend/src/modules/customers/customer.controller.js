import customerService from "./customer.service.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomerQuerySchema,
} from "./customer.validator.js";

const list = async (req, res, next) => {
  try {
    const query = await listCustomerQuerySchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    const { items, pagination } = await customerService.list(query);

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
    const customer = await customerService.getById(req.params.id);

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const payload = await createCustomerSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const customer = await customerService.create(payload);

    res.status(201).json({
      success: true,
      message: "Pelanggan berhasil ditambahkan",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const payload = await updateCustomerSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const customer = await customerService.update(req.params.id, payload);

    res.json({
      success: true,
      message: "Data pelanggan berhasil diperbarui",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await customerService.remove(req.params.id);

    res.json({
      success: true,
      message: "Pelanggan berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};

export default { list, detail, create, update, remove };
