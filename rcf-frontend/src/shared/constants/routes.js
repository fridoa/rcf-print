export const ROUTES = {
  login: "/login",
  // Path harus PERSIS link email reset dari backend
  // (mails/templates/resetPassword.js): /lupa-katasandi?token=...
  lupaKatasandi: "/lupa-katasandi",
  dashboard: "/",
  profile: "/profil",
  changePassword: "/profil/ganti-password",
  customers: "/pelanggan",
  users: "/pengguna",
  // Order — Opsi B: satu layar kerja per peran, sesuai mockup client.
  orders: "/pesanan", // ADMIN: buat order, selesaikan (bayar), semua order
  desain: "/desain", // DESIGNER: antrian desain
  cetak: "/cetak", // PRODUKSI (DTF): antrian cetak
  polyflex: "/polyflex", // PRODUKSI (Polyflex): antrian cutting
  sublim: "/sublim", // PRODUKSI (Sublim): antrian sublim
  packing: "/packing", // PACKING: antrian packing + tandai siap
  rekap: "/rekap",
};
