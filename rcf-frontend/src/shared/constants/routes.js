export const ROUTES = {
  login: "/login",
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
  packing: "/packing", // PACKING: antrian packing + tandai siap
  rekap: "/rekap",
};
