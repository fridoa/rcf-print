import * as Yup from "yup";

/** "" → undefined supaya field tanggal opsional tidak gagal typeError. */
const kosongJadiUndefined = (v, original) =>
  original === "" ? undefined : v;

/**
 * Query rekap harian: rentang tanggal (dari–sampai) inklusif di kedua ujung.
 *
 * Keduanya opsional. Default (dipasang di service, bukan di sini) = bulan
 * berjalan, supaya buka halaman langsung ada isi tanpa memaksa admin memilih.
 * Kalau hanya salah satu diisi, service memperlakukan sisi lain sebagai
 * terbuka (mis. "dari 1 Agustus" tanpa sampai = 1 Agustus s/d hari ini).
 *
 * `sampai` divalidasi tidak boleh sebelum `dari` — kesalahan input yang
 * paling gampang terjadi saat mengetik dua tanggal.
 */
export const rekapQuerySchema = Yup.object({
  dari: Yup.date()
    .transform(kosongJadiUndefined)
    .typeError("Tanggal 'dari' tidak valid"),
  sampai: Yup.date()
    .transform(kosongJadiUndefined)
    .typeError("Tanggal 'sampai' tidak valid")
    .when("dari", (dari, schema) =>
      // Cek isNaN: kalau "dari" tidak bisa diparse, Yup masih meneruskan
      // Invalid Date ke sini dan schema.min() melempar RangeError (jadi 500).
      // Biarkan typeError "dari" yang bicara — di sini cukup dilewati.
      dari && dari[0] && !Number.isNaN(dari[0].getTime())
        ? schema.min(dari[0], "Tanggal 'sampai' tidak boleh sebelum 'dari'")
        : schema
    ),
});
