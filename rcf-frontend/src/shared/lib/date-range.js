/**
 * Helper rentang tanggal untuk filter berbasis hari WIB.
 *
 * Semua nilai rentang di FE berbentuk string "YYYY-MM-DD" — format yang
 * dipahami backend (`tgl_dari`/`tgl_sampai`) dan `DateRangePickerField`.
 * Perbandingan string "YYYY-MM-DD" secara leksikografis sama dengan
 * perbandingan kronologis, jadi tidak perlu Date untuk urusan urutan.
 *
 * Batas hari mengikuti Asia/Jakarta karena itu yang dipakai backend saat
 * menormalkan `tgl_order`. Kalau memakai tanggal lokal mesin, admin di zona
 * lain (atau laptop yang zonanya salah) bisa melihat rentang bergeser sehari.
 *
 * Tidak ada helper "rentang bawaan" di sini: halaman Pesanan sengaja dibuka
 * TANPA filter tanggal (lihat PesananPage), jadi rentang selalu berasal dari
 * pilihan admin di kalender.
 */

const TZ = "Asia/Jakarta";

/** "YYYY-MM-DD" untuk `date` menurut kalender Jakarta. */
export const tanggalJakarta = (date = new Date()) => {
  // en-CA memberi format YYYY-MM-DD; dipakai supaya tak perlu menyusun manual.
  return date.toLocaleDateString("en-CA", { timeZone: TZ });
};

/** Geser "YYYY-MM-DD" sebanyak n hari (n boleh negatif). */
export const geserHari = (tglStr, n) => {
  const [y, m, d] = tglStr.split("-").map(Number);
  // UTC dipakai sebagai kalender netral: kita hanya menghitung hari, dan
  // Date.UTC bebas dari DST/zona mesin.
  const ms = Date.UTC(y, m - 1, d) + n * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
};

/**
 * Label grup untuk header pemisah tabel: "Hari Ini", "Kemarin", atau tanggal
 * lengkap dengan nama hari ("Sen, 25 Agu 2026").
 *
 * Pemanggil yang menampilkannya sebagai baris pemisah menambahkan awalan
 * "Order " sendiri ("Order Hari Ini") — label di sini tetap murni tanggal
 * supaya bisa dipakai di konteks lain.
 * @param {string|Date} nilai tgl_order (ISO string atau Date)
 * @param {Date} [acuan]
 */
export const labelGrupTanggal = (nilai, acuan = new Date()) => {
  if (!nilai) return "Tanpa tanggal";
  const d = nilai instanceof Date ? nilai : new Date(nilai);
  if (Number.isNaN(d.getTime())) return "Tanpa tanggal";

  const tgl = tanggalJakarta(d);
  const hariIni = tanggalJakarta(acuan);

  if (tgl === hariIni) return "Hari Ini";
  if (tgl === geserHari(hariIni, -1)) return "Kemarin";

  return d.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  });
};

/**
 * Kelompokkan order berurutan menjadi [{ kunci, label, orders }].
 *
 * Grouping murni VISUAL atas baris yang sedang dimuat (halaman aktif atau
 * batch infinite scroll), bukan agregasi server. Konsekuensinya: satu grup
 * bisa terpotong antar halaman dan header-nya muncul lagi di halaman
 * berikutnya. Itu diterima — alternatifnya agregasi per hari di backend, yang
 * berlebihan untuk jumlah data di sini. Karena itu daftar harus di-sort
 * berdasarkan tgl_order supaya grup tidak terpecah-pecah.
 */
export const kelompokkanPerTanggal = (orders = [], acuan = new Date()) => {
  const grup = [];

  for (const order of orders) {
    const kunci = order.tgl_order
      ? tanggalJakarta(new Date(order.tgl_order))
      : "tanpa-tanggal";
    const terakhir = grup[grup.length - 1];

    if (terakhir && terakhir.kunci === kunci) {
      terakhir.orders.push(order);
    } else {
      grup.push({
        kunci,
        label: labelGrupTanggal(order.tgl_order, acuan),
        orders: [order],
      });
    }
  }

  return grup;
};
