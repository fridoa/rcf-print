# ERD Revisi v2 — Order Terpisah per Jenis (RCF Print)

> Revisi dari `Final_ERD_Workflow_Order_Kaos_MERN.md`
> Keputusan desain: **satu order = satu jenis sablon** (DTF atau POLYFLEX), antrean terpisah.
> Stack: MERN (MongoDB, Express, React, Node). Catatan alternatif Postgres ada di bagian akhir.
> Tanggal revisi: 22 Agustus 2026

---

## Ringkasan Perubahan dari v1

| # | v1 (ERD awal) | v2 (revisi ini) | Alasan |
|---|---------------|-----------------|--------|
| 1 | `jenis_sablon_id` ada di `order_details` (per desain) | `jenis` ada di `orders` (per order) | Mockup client memisahkan DTF dan POLYFLEX jadi dua tabel + dua prefix nomor |
| 2 | Collection `jenis_sablon` | Dihapus, diganti enum `jenis` | Menghindari dua sumber data jenis yang bisa bertentangan |
| 3 | Satu rangkaian status untuk semua order | Status set berbeda per jenis (CETAK vs CUTTING) | DTF dicetak, Polyflex di-cutting; beda mesin dan operator |
| 4 | `kode_order` tanpa aturan | Format `PREFIX/DDMMYY/NNN`, urut harian per jenis | Sesuai mockup (`DTF/210826/001`, `PLF/210826/002`) |
| 5 | Invoice & pembayaran di luar scope | `metode_bayar` + `total_harga` masuk ke `orders` | Halaman Rekap Data di mockup menampilkan total Cash dan Transfer |
| 6 | Tidak ada `counters` | Ditambah collection `counters` | Nomor urut harian harus aman dari tabrakan (race condition) |

**Konsekuensi yang harus disetujui client:** order campuran (satu kaos memakai DTF *dan* Polyflex sekaligus) harus diinput sebagai **dua order dengan dua nomor terpisah**, tanpa penghubung antar keduanya. Belum dikonfirmasi.

---

## Workflow

### DTF

```text
ANTRI_DESAIN
   │  (Designer: desain jadi + isi file & qty)
   ▼
ANTRI_CETAK
   │  (Operator cetak: selesai cetak)
   ▼
PACKING
   │  (Packing: sudah dikemas)
   ▼
READY  ──► Admin kabari konsumen via WA
   │  (Admin: barang diambil + catat pembayaran)
   ▼
SELESAI  (hilang dari daftar order aktif)
```

### POLYFLEX

```text
ANTRI_DESAIN
   │  (Designer: desain jadi + isi file & qty)
   ▼
ANTRI_CUTTING
   │  (Operator cutting: selesai cutting)
   ▼
PACKING
   │  (Packing: sudah dikemas)
   ▼
READY  ──► Admin kabari konsumen via WA
   │  (Admin: barang diambil + catat pembayaran)
   ▼
SELESAI
```

Perbedaan tunggal antara kedua jalur: **ANTRI_CETAK** (DTF) vs **ANTRI_CUTTING** (POLYFLEX). Sisanya identik.

### Status Set

```text
DTF      : ANTRI_DESAIN → ANTRI_CETAK   → PACKING → READY → SELESAI
POLYFLEX : ANTRI_DESAIN → ANTRI_CUTTING → PACKING → READY → SELESAI
```

Aturan: transisi hanya boleh maju satu langkah sesuai jalur jenisnya. Mundur (koreksi salah klik) hanya boleh oleh ADMIN dan wajib tercatat di `status_logs`.

---

## Role & Hak Transisi

| Role | Boleh mengubah status | Dari → Ke |
|------|----------------------|-----------|
| ADMIN | Buat order, selesaikan order, koreksi | – → `ANTRI_DESAIN`, `READY` → `SELESAI`, mundur (koreksi) |
| DESIGNER | Selesai desain | `ANTRI_DESAIN` → `ANTRI_CETAK` / `ANTRI_CUTTING` |
| PRODUKSI | Selesai cetak / cutting | `ANTRI_CETAK` / `ANTRI_CUTTING` → `PACKING` |
| PACKING | Selesai packing | `PACKING` → `READY` |

Catatan: pada mockup, layar CETAK dan POLYFLEX sama-sama punya kartu "SELESAI PACKING", jadi kemungkinan role PRODUKSI dan PACKING dipegang orang yang sama. Struktur di atas tetap memisahkan keduanya supaya bisa digabung nanti (satu user diberi dua role) tanpa mengubah skema.

---

## ERD

```text
                    ┌─────────────────────┐
                    │        USERS        │
                    ├─────────────────────┤
                    │ _id                 │
                    │ nama                │
                    │ username            │
                    │ email               │
                    │ password_hash       │
                    │ role                │
                    │ is_active           │
                    │ reset_token_hash    │
                    │ reset_token_exp     │
                    │ created_at          │
                    │ updated_at          │
                    └─────┬──────────┬────┘
                          │          │
                created_by│          │user_id
                          ▼          ▼
┌──────────────────────┐  1:N  ┌────────────────────────────┐  1:N  ┌────────────────────────┐
│      CUSTOMERS       │──────▶│           ORDERS           │──────▶│      STATUS_LOGS       │
├──────────────────────┤       ├────────────────────────────┤       ├────────────────────────┤
│ _id                  │       │ _id                        │       │ _id                    │
│ nama                 │       │ kode_order        (unik)   │       │ order_id               │
│ no_wa                │       │ jenis   DTF|POLYFLEX       │       │ status_dari            │
│ created_at           │       │ customer_id                │       │ status_ke              │
│ updated_at           │       │ tgl_order                  │       │ user_id                │
└──────────────────────┘       │ seq_harian                 │       │ catatan                │
                               │ file_count                 │       │ created_at             │
                               │ total_qty                  │       └────────────────────────┘
                               │ deadline                   │
                               │ status                     │
                               │ total_harga                │
                               │ metode_bayar CASH|TRANSFER │
                               │ catatan                    │
                               │ created_by                 │
                               │ designed_by                │
                               │ selesai_at                 │
                               │ created_at                 │
                               │ updated_at                 │
                               └──────────┬─────────────────┘
                                          │ 1:N
                                          ▼
                            ┌────────────────────────────────┐
                            │         ORDER_DETAILS          │
                            ├────────────────────────────────┤
                            │ _id                            │
                            │ order_id                       │
                            │ label_desain                   │
                            │ posisi                         │
                            │ file_desain                    │
                            │ catatan                        │
                            │ created_at                     │
                            │ updated_at                     │
                            └────────────────────────────────┘

                            ┌────────────────────────────────┐
                            │           COUNTERS             │
                            ├────────────────────────────────┤
                            │ _id  ("DTF-210826")            │
                            │ jenis                          │
                            │ tanggal                        │
                            │ seq                            │
                            └────────────────────────────────┘
```

`order_details` tidak lagi menyimpan jenis sablon — jenisnya diwarisi dari order induknya.

---

## Collection

### users

```text
_id
nama
username        unik, wajib
email           unik, wajib
password_hash
role            ADMIN | DESIGNER | PRODUKSI | PACKING
is_active       default true
reset_token_hash    nullable
reset_token_exp     nullable
created_at
updated_at
```

Catatan `email`: **wajib dan unik**, disimpan lowercase + trim. Bersama `username`, email adalah identifier login — user boleh masuk dengan salah satu dari keduanya.

```js
// MongoDB
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
```

Login dengan satu field identifier:

```js
// POST /auth/login  body: { identifier, password }
const id = String(identifier).trim().toLowerCase();
const user = await User.findOne({
  $or: [{ username: id }, { email: id }],
  is_active: true,
});
// pesan error disamakan untuk user tidak ada / password salah,
// agar tidak membocorkan username atau email mana yang terdaftar
```

Karena keduanya dipakai sebagai identifier, `username` juga harus disimpan lowercase — kalau tidak, "Admin" dan "admin" akan jadi dua akun berbeda dan pencarian `$or` di atas tidak konsisten. Validasi tambahan: username tidak boleh berformat email (tidak boleh mengandung `@`), supaya tidak ada username yang menyerupai email milik user lain.

Reset password lewat email:

```text
1. User minta reset  → POST /auth/forgot-password  { email }
2. Server buat token acak (32 byte), kirim token mentah via email,
   simpan HASH-nya di reset_token_hash + masa berlaku di reset_token_exp (mis. 1 jam)
3. User buka link  → POST /auth/reset-password  { token, password_baru }
4. Server cek hash + belum kedaluwarsa → ganti password_hash,
   kosongkan reset_token_hash & reset_token_exp (token sekali pakai)
```

Yang penting: token disimpan sebagai hash, bukan mentah — kalau database bocor, token tidak bisa langsung dipakai. Endpoint forgot-password selalu menjawab sukses walau email tidak terdaftar, agar tidak jadi alat pengecek email mana yang ada di sistem. Pengiriman email butuh layanan SMTP (mis. Gmail App Password atau Resend/Brevo gratis) — perlu disiapkan saat deploy.

User dibuat oleh ADMIN. **Tombol "DAFTAR" pada mockup halaman login sebaiknya dihapus** — pendaftaran mandiri tidak sesuai dengan model ini. Yang perlu ditambahkan di layar login justru tautan **"Lupa password?"**.

### customers

```text
_id
nama
no_wa
created_at
updated_at
```

`no_wa` dipakai untuk tombol/link `wa.me` saat status READY (admin mengabari konsumen). Nomor disimpan ternormalisasi ke format 62xxxxxxxxxx.

### orders

```text
_id
kode_order      unik, contoh "DTF/210826/001"
jenis           DTF | POLYFLEX          ← penentu prefix & jalur status
customer_id     ref customers
tgl_order       tanggal (dipakai untuk penomoran & rekap harian)
seq_harian      angka urut dalam hari + jenis tersebut
file_count      null sampai desain selesai
total_qty       null sampai desain selesai
deadline        nullable
status          lihat status set per jenis
total_harga     nullable, terisi saat serah terima   (perlu konfirmasi client)
metode_bayar    CASH | TRANSFER, null sampai SELESAI
catatan
created_by      ref users (admin)
designed_by     ref users, terisi saat desain selesai
selesai_at      timestamp saat status → SELESAI
created_at
updated_at
```

Index yang perlu:

```text
{ kode_order: 1 }                  unik
{ jenis: 1, status: 1 }            daftar order aktif per layar
{ tgl_order: 1, jenis: 1 }         rekap harian & penomoran
{ customer_id: 1 }                 riwayat pelanggan
{ status: 1, updated_at: -1 }      urutan antrean
```

Aturan data:

- `file_count` dan `total_qty` sengaja `null` selama status `ANTRI_DESAIN`. Kolom kosong di tabel adalah indikator visual bahwa order belum siap diproses (persis seperti mockup).
- Order dengan status `SELESAI` tidak muncul di daftar order aktif, tapi tetap ada untuk Data Order dan Rekap.

### order_details

Satu record = satu desain dalam order.

```text
_id
order_id        ref orders
label_desain    contoh "Logo Depan", "Nama"
posisi          contoh "Depan", "Belakang", "Dada Kiri"
file_desain     path/URL file (nullable jika upload belum dipakai)
catatan
created_at
updated_at
```

Status: **opsional pada MVP.** Mockup tidak menampilkan rincian desain sama sekali — hanya angka `file_count`. Jika client tidak membutuhkan rincian per desain, collection ini bisa ditunda dan `file_count` cukup disimpan sebagai angka di `orders`. Perlu konfirmasi.

### status_logs

```text
_id
order_id        ref orders
status_dari     null untuk pembuatan order
status_ke
user_id         ref users
catatan
created_at
```

Berbeda dari v1: menyimpan `status_dari` juga, supaya koreksi/mundur bisa diaudit.

### counters

```text
_id        "<JENIS>-<DDMMYY>"   contoh "DTF-220826"
jenis
tanggal
seq
```

---

## Penomoran Order

Format:

```text
<PREFIX>/<DDMMYY>/<NNN>

PREFIX : DTF  → jenis DTF
         PLF  → jenis POLYFLEX
DDMMYY : tanggal order, contoh 220826 = 22 Agustus 2026
NNN    : urut 3 digit, reset setiap hari, terpisah per jenis
```

Contoh: `DTF/220826/001`, `DTF/220826/002`, `PLF/220826/001`.

Nomor urut DTF dan Polyflex berjalan sendiri-sendiri — hari yang sama boleh punya `DTF/220826/001` dan `PLF/220826/001` sekaligus.

Pengambilan nomor harus atomik agar dua admin yang input bersamaan tidak mendapat nomor sama:

```js
// MongoDB — atomik, aman untuk request paralel
const prefix = jenis === 'DTF' ? 'DTF' : 'PLF';
const key = `${prefix}-${ddmmyy}`;
const c = await Counter.findOneAndUpdate(
  { _id: key },
  { $inc: { seq: 1 }, $setOnInsert: { jenis, tanggal } },
  { upsert: true, returnDocument: 'after' }
);
const kode_order = `${prefix}/${ddmmyy}/${String(c.seq).padStart(3, '0')}`;
```

Catatan zona waktu: batas hari memakai **Asia/Jakarta (UTC+7)**, bukan UTC. Kalau tidak, order yang masuk sore hari bisa terhitung sebagai hari berikutnya.

---

## Layar → Query

| Layar (mockup) | Data yang ditampilkan | Aksi |
|----------------|----------------------|------|
| ADMIN | `status != SELESAI`, dikelompokkan per `jenis` | Order Baru (pelanggan + jenis) → `ANTRI_DESAIN`; Orderan Selesai (kode + payment) → `SELESAI` |
| DESIGN | `status = ANTRI_DESAIN`, kedua jenis (tabel DTF & POLYFLEX terpisah) | Desain Selesai: isi `file_count`, `total_qty` → `ANTRI_CETAK` / `ANTRI_CUTTING` |
| CETAK | `jenis = DTF` dan `status in (ANTRI_CETAK, PACKING)` | Selesai cetak → `PACKING`; Selesai packing → `READY` |
| POLYFLEX | `jenis = POLYFLEX` dan `status in (ANTRI_CUTTING, PACKING)` | Selesai cutting → `PACKING`; Selesai packing → `READY` |
| DATA ORDER | filter `tgl_order` dan/atau nama konsumen, semua status | – |
| REKAP DATA | agregat per tanggal (lihat di bawah) | filter rentang tanggal |

Karena Polyflex ikut lewat tahap desain, tabel POLYFLEX pada layar DESIGN (yang di mockup kosong) memang terpakai. Ini menyelesaikan pertentangan antar dua gambar di v1.

### Rekap Harian

Kolom pada mockup: TANGGAL, PELANGGAN (jumlah), FILE, QTY, CASH, TRANSFER.

```text
Sumber : orders dengan status = SELESAI
Kunci  : tgl_order (atau selesai_at — perlu konfirmasi, lihat catatan)
Agregat:
  pelanggan  = jumlah customer_id unik
  file       = SUM(file_count)
  qty        = SUM(total_qty)
  cash       = SUM(total_harga) WHERE metode_bayar = CASH
  transfer   = SUM(total_harga) WHERE metode_bayar = TRANSFER
```

Catatan: rekap uang sebaiknya dikelompokkan berdasarkan **tanggal pembayaran diterima (`selesai_at`)**, bukan tanggal order dibuat — kalau tidak, uang yang masuk hari ini akan tercatat di tanggal beberapa hari lalu. Perlu dikonfirmasi ke client.

Perbaikan yang disarankan untuk halaman rekap: filter **rentang** tanggal (dari–sampai) karena tabelnya menampilkan banyak hari, tambahkan baris TOTAL, dan format angka sebagai `Rp 3.512.000`.

---

## Yang Masih Perlu Konfirmasi Client

1. **Harga masuk dari mana.** Belum ada kolom harga di form mana pun, padahal Rekap butuh total Cash/Transfer. Pilihan: (a) admin input saat order dibuat, (b) admin input saat serah terima, (c) otomatis dari tarif per jenis × qty (butuh daftar tarif). Skema ini memakai asumsi (b).
2. **Order campuran DTF + Polyflex** jadi dua nomor terpisah — disetujui atau tidak.
3. **Status "sedang dikerjakan"** (`DESAIN`, `CETAK`, `CUTTING`) beserta tombol MULAI pada mockup: dipakai atau cukup tombol selesai saja. Skema ini mengikuti penjelasan client (tanpa status sedang dikerjakan). Jika nanti dipakai, tinggal menambah nilai enum status — tidak mengubah struktur tabel.
4. **`order_details` dan upload file desain** perlu atau tidak untuk MVP.
5. **Basis tanggal rekap**: `tgl_order` atau `selesai_at`.

---

## Catatan Alternatif: Postgres + Prisma

Kalau stack boleh diganti dari MongoDB, Postgres lebih cocok untuk kebutuhan ini:

- Penomoran urut harian aman lewat transaksi + unique constraint `(jenis, tgl_order, seq_harian)`; tabrakan nomor dicegah oleh database, bukan oleh kode aplikasi.
- Rekap harian adalah agregasi `GROUP BY` biasa, jauh lebih sederhana daripada aggregation pipeline.
- Enum status dan role dijaga di level skema, mencegah nilai status ngawur.

Struktur di atas dapat dipetakan langsung: setiap collection menjadi tabel, `_id` menjadi `id`, relasi `ref` menjadi foreign key.
