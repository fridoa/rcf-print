import createHttpError from "http-errors";
import ImageKit from "imagekit";
import { env, isAutotest } from "../config/env.js";

/**
 * Adapter penyimpanan file desain.
 *
 * Seluruh modul galeri bicara ke fungsi-fungsi di sini, TIDAK langsung ke SDK
 * ImageKit. Tujuannya dua:
 *   1. Kalau nanti pindah vendor (Cloudinary/S3), cukup ganti isi file ini —
 *      model, service, dan controller tidak berubah.
 *   2. Di autotest, adapter memakai implementasi PALSU (in-memory) sehingga
 *      test tidak menyentuh jaringan, tidak butuh kredensial, dan deterministik.
 *
 * Kredensial ImageKit sengaja opsional di config/env.js: server tetap boot
 * tanpa kredensial. Yang menegakkan kelengkapannya adalah `ensureSiap()` di
 * bawah — jadi lupa mengisi env hanya mematikan fitur upload (503), bukan
 * seluruh API.
 */

/** True kalau tiga kredensial ImageKit sudah lengkap. */
export const storageSiap = () =>
  Boolean(
    env.IMAGEKIT_PUBLIC_KEY &&
      env.IMAGEKIT_PRIVATE_KEY &&
      env.IMAGEKIT_URL_ENDPOINT
  );

/**
 * Lempar 503 kalau storage belum dikonfigurasi. Dipanggil di service SEBELUM
 * menyentuh file, supaya admin dapat pesan jelas ("fitur galeri belum aktif")
 * alih-alih error koneksi yang membingungkan.
 */
const ensureSiap = () => {
  if (!storageSiap()) {
    throw createHttpError(
      503,
      "Fitur upload desain belum aktif: kredensial ImageKit belum diisi di server"
    );
  }
};

// Klien ImageKit dibuat malas (lazy) dan di-cache. Tidak dibuat saat import
// supaya modul ini bisa di-import walau kredensial kosong (mis. di autotest).
let _client = null;
const client = () => {
  if (!_client) {
    _client = new ImageKit({
      publicKey: env.IMAGEKIT_PUBLIC_KEY,
      privateKey: env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
    });
  }
  return _client;
};

/**
 * Implementasi PALSU untuk autotest: tidak ada jaringan, hasil deterministik
 * berdasar nama file. Bentuk return-nya identik dengan versi ImageKit asli
 * supaya service tidak bisa membedakan keduanya.
 */
const fakeStorage = {
  upload: async ({ fileName, folder }) => {
    const id = `fake_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const base = `https://ik.local/test${folder}/${id}-${fileName}`;
    return {
      fileId: id,
      url: base,
      thumbnailUrl: `${base}?tr=w-200,h-200`,
      name: fileName,
      size: 0,
      height: null,
      width: null,
    };
  },
  remove: async () => {
    // no-op: tidak ada file nyata untuk dihapus
    return { deleted: true };
  },
};

/**
 * Unggah satu file desain.
 *
 * @param {object} p
 * @param {Buffer} p.buffer     isi file (dari multer memoryStorage)
 * @param {string} p.fileName   nama file asli
 * @returns {Promise<{fileId,url,thumbnailUrl,name,size,height,width}>}
 */
export const uploadDesain = async ({ buffer, fileName }) => {
  if (isAutotest) {
    return fakeStorage.upload({ fileName, folder: env.IMAGEKIT_FOLDER });
  }

  ensureSiap();

  const res = await client().upload({
    file: buffer, // SDK menerima Buffer langsung
    fileName,
    folder: env.IMAGEKIT_FOLDER,
    useUniqueFileName: true,
  });

  return {
    fileId: res.fileId,
    url: res.url,
    thumbnailUrl: res.thumbnailUrl || `${res.url}?tr=w-200,h-200`,
    name: res.name,
    size: res.size ?? 0,
    height: res.height ?? null,
    width: res.width ?? null,
  };
};

/**
 * Hapus file dari storage berdasarkan fileId. Aman dipanggil dengan fileId
 * kosong (langsung no-op) supaya penghapusan dokumen tidak gagal hanya karena
 * file-nya sudah hilang di sisi ImageKit.
 */
export const hapusDesain = async (fileId) => {
  if (!fileId) return { deleted: false };
  if (isAutotest) return fakeStorage.remove(fileId);

  ensureSiap();
  return client().deleteFile(fileId);
};
