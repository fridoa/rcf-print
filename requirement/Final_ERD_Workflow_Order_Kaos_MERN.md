# Final ERD - Workflow Order Kaos (MVP)

> Tech Stack: MERN (MongoDB, Express.js, React.js, Node.js)

## Tujuan

ERD ini dibuat berdasarkan workflow dan kebutuhan client saat ini (MVP), tanpa menambahkan fitur yang belum diperlukan agar proses development tetap sederhana dan sesuai budget.

---

# Workflow

```text
Admin
   │
   ▼
Antri Desain
   │
   ▼
Designer
   │
   ▼
Antri Produksi
   │
   ▼
Produksi
   │
   ▼
Packing
   │
   ▼
Ready
   │
   ▼
Selesai
```

---

# Role

| Role | Deskripsi |
|------|-----------|
| Admin | Input order, kelola customer, kelola user, menyelesaikan order |
| Designer | Mengerjakan desain |
| Produksi | Mengerjakan semua jenis sablon |
| Packing | Packing dan mengubah status menjadi Ready |

---

# Status Order

```text
ANTRI_DESAIN
ANTRI_PRODUKSI
PACKING
READY
SELESAI
```

---

# ERD

```text
                    ┌─────────────────────┐
                    │        USERS        │
                    ├─────────────────────┤
                    │ _id                 │
                    │ nama                │
                    │ username            │
                    │ password_hash       │
                    │ role                │
                    │ is_active           │
                    │ created_at          │
                    │ updated_at          │
                    └──────────┬──────────┘
                               │
                               │ created_by
                               ▼

┌──────────────────────┐      1 : N      ┌────────────────────────────┐
│      CUSTOMERS       │────────────────▶│          ORDERS            │
├──────────────────────┤                 ├────────────────────────────┤
│ _id                  │                 │ _id                        │
│ nama                 │                 │ kode_order                 │
│ no_wa                │                 │ customer_id                │
│ created_at           │                 │ total_qty                  │
│ updated_at           │                 │ file_count                 │
└──────────────────────┘                 │ deadline                   │
                                         │ status                     │
                                         │ catatan                    │
                                         │ created_by                 │
                                         │ created_at                 │
                                         │ updated_at                 │
                                         └──────────┬─────────────────┘
                                                    │
                                               1 : N│
                                                    ▼
                              ┌────────────────────────────────────┐
                              │         ORDER_DETAILS             │
                              ├────────────────────────────────────┤
                              │ _id                               │
                              │ order_id                          │
                              │ label_desain                      │
                              │ jenis_sablon_id                   │
                              │ posisi                            │
                              │ file_desain                       │
                              │ catatan                           │
                              │ created_at                        │
                              │ updated_at                        │
                              └─────────────┬──────────────────────┘
                                            │
                                            ▼
                              ┌────────────────────────────┐
                              │      JENIS_SABLON          │
                              ├────────────────────────────┤
                              │ _id                        │
                              │ nama                       │
                              │ created_at                 │
                              │ updated_at                 │
                              └────────────────────────────┘

                    ┌────────────────────────────┐
                    │        STATUS_LOGS         │
                    ├────────────────────────────┤
                    │ _id                        │
                    │ order_id                   │
                    │ status                     │
                    │ user_id                    │
                    │ catatan                    │
                    │ created_at                 │
                    └────────────────────────────┘
```

---

# Collection

## users

```text
_id
nama
username
password_hash
role
is_active
created_at
updated_at
```

Role:

- ADMIN
- DESIGNER
- PRODUKSI
- PACKING

---

## customers

```text
_id
nama
no_wa
created_at
updated_at
```

---

## orders

```text
_id
kode_order
customer_id
total_qty
file_count
deadline
status
catatan
created_by
created_at
updated_at
```

Keterangan:

- **total_qty** = total jumlah kaos dalam satu order.
- **file_count** = jumlah desain/file pada order.

---

## order_details

Satu record mewakili satu desain.

```text
_id
order_id
label_desain
jenis_sablon_id
posisi
file_desain
catatan
created_at
updated_at
```

Contoh:

| Label Desain | Jenis Sablon | Posisi |
|--------------|--------------|---------|
| Logo Depan | DTF | Depan |
| Logo Belakang | DTF | Belakang |
| Nama | Polyflex | Dada Kiri |

---

## jenis_sablon

```text
_id
nama
created_at
updated_at
```

Contoh data:

- DTF
- Polyflex

---

## status_logs

```text
_id
order_id
status
user_id
catatan
created_at
```

Digunakan untuk menyimpan histori perubahan status order.

---

# Relationship

```text
Customer
1 ─────── N Orders

Orders
1 ─────── N OrderDetails

Orders
1 ─────── N StatusLogs

JenisSablon
1 ─────── N OrderDetails

Users
1 ─────── N Orders

Users
1 ─────── N StatusLogs
```

---

# Scope MVP

Fitur yang **belum** termasuk:

- Approval desain
- Riwayat revisi file
- Multi produk
- Ukuran (S, M, L, XL)
- Warna kaos
- Bahan kaos
- Invoice & pembayaran
- WhatsApp API
- QR Code
- Dashboard analytics

ERD ini menjadi acuan database untuk pengembangan aplikasi Workflow Order Kaos versi MVP menggunakan MERN Stack.
