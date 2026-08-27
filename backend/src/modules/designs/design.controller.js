import designService from "./design.service.js";
import {
  listDesignQuerySchema,
  uploadDesignSchema,
} from "./design.validator.js";

const list = async (req, res, next) => {
  try {
    const query = await listDesignQuerySchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    const { items, pagination } = await designService.list(query);

    res.json({ success: true, data: items, pagination });
  } catch (error) {
    next(error);
  }
};

const detail = async (req, res, next) => {
  try {
    const design = await designService.getById(req.params.id);
    res.json({ success: true, data: design });
  } catch (error) {
    next(error);
  }
};

const upload = async (req, res, next) => {
  try {
    // multer sudah mengisi req.file (buffer) dan req.body (field teks).
    const payload = await uploadDesignSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (!req.file) {
      // Tidak ada file terkirim di field "file".
      return res.status(400).json({
        success: false,
        message: 'File desain wajib diunggah pada field "file"',
      });
    }

    const { design, deduped } = await designService.upload({
      customer_id: payload.customer_id,
      label: payload.label,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      size: req.file.size,
      uploaded_by: req.user.id,
    });

    // 200 kalau dedup (memakai desain lama), 201 kalau benar-benar baru.
    res.status(deduped ? 200 : 201).json({
      success: true,
      message: deduped
        ? "Desain identik sudah ada, memakai desain yang tersimpan"
        : "Desain berhasil diunggah",
      deduped,
      data: design,
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await designService.remove(req.params.id);
    res.json({ success: true, message: "Desain berhasil dihapus" });
  } catch (error) {
    next(error);
  }
};

export default {
  list,
  detail,
  upload,
  remove,
};
