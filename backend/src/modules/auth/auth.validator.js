import * as Yup from "yup";

export const loginSchema = Yup.object({
  identifier: Yup.string()
    .required("Username atau email wajib diisi")
    .trim()
    .lowercase(),
  password: Yup.string().required("Password wajib diisi"),
});
