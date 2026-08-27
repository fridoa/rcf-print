import { useMemo, useState } from "react";
import { TextField, Spinner } from "@/shared/components/ui";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { formatWhatsapp, normalizeWhatsapp } from "@/shared/lib/phone";
import { useCustomers, useCreateCustomer } from "@/features/customers";
import { cn } from "@/shared/lib/cn";

/**
 * Pemilih pelanggan untuk form order — nomor HP sebagai kunci.
 *
 * PENTING: pemilih ini SELALU menghasilkan customer_id. Galeri desain bersifat
 * per-pelanggan, jadi order harus tahu pelanggannya SEBELUM desain dipilih /
 * diupload. Karena itu untuk nomor baru, komponen membuat pelanggan lebih dulu
 * lewat POST /customers, lalu melapor customer_id-nya.
 *
 * Alur (conditional rendering, satu tampilan):
 *   1. Admin mengetik nomor / nama di kotak cari.
 *   2. Ada yang cocok → daftar hasil muncul, klik untuk memilih pelanggan lama.
 *   3. Tidak ada hasil & nomor tampak valid → form BERTAMBAH: field "Nama
 *      Pelanggan" muncul inline di bawah kotak cari. Isi nama lalu konfirmasi →
 *      komponen POST /customers dan memilih hasilnya. Tidak ada mode/panel
 *      terpisah — semua di tampilan yang sama.
 *
 * onChange(payload): payload berupa
 *   - { customer_id, label }   (pelanggan terpilih, lama maupun baru dibuat)
 *   - null                     (reset)
 */
export function CustomerPicker({ selection, onChange, error }) {
  const [input, setInput] = useState("");
  const [namaBaru, setNamaBaru] = useState("");
  const cari = useDebouncedValue(input);

  const createCustomer = useCreateCustomer();

  const { data, isFetching } = useCustomers({
    search: cari,
    page: 1,
    limit: 8,
    sort: "name",
  });

  // Nomor yang diketik terlihat "sah" (>= 9 digit setelah normalisasi)?
  // Dipakai untuk memutuskan apakah blok "pelanggan baru" masuk akal muncul.
  const nomorNormal = useMemo(() => normalizeWhatsapp(input), [input]);
  const nomorTampakValid = /^62\d{8,13}$/.test(nomorNormal);

  const items = data?.items ?? [];
  const adaHasil = items.length > 0;

  // Pencarian sudah "settle" (query = input debounce terakhir) supaya blok
  // pelanggan baru tidak berkedip muncul saat hasil masih dalam perjalanan.
  const pencarianSettle = cari === input && !isFetching;
  // Form "bertambah": tampilkan sub-form pelanggan baru inline.
  const tawarkanBaru = Boolean(input) && pencarianSettle && !adaHasil && nomorTampakValid;

  // Buat pelanggan baru lalu pilih hasilnya (dapat customer_id asli dari server).
  const simpanPelangganBaru = () => {
    const nama = namaBaru.trim();
    if (nama.length < 3) return;

    createCustomer.mutate(
      { whatsapp: nomorNormal, name: nama },
      {
        onSuccess: (customer) => {
          onChange({
            customer_id: customer._id,
            label: `${customer.name} (${formatWhatsapp(customer.whatsapp)})`,
          });
          setNamaBaru("");
          setInput("");
        },
      }
    );
  };

  // Sudah memilih: tampilkan ringkasan + tombol Ganti.
  if (selection?.label) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">Pelanggan</span>
        <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
          <span className="text-sm text-slate-800">{selection.label}</span>
          <button
            type="button"
            className="text-xs font-medium text-brand-600 hover:underline"
            onClick={() => {
              onChange(null);
              setNamaBaru("");
              setInput("");
            }}
          >
            Ganti
          </button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-danger-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Tampilan cari + (kondisional) sub-form pelanggan baru inline.
  return (
    <div className="flex flex-col gap-1.5">
      <TextField
        label="Pelanggan"
        type="search"
        placeholder="Cari / ketik nomor WhatsApp"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        error={error}
        autoComplete="off"
        hint="Nomor jadi kunci. Kalau belum terdaftar, isian pelanggan baru muncul otomatis."
      />

      {input && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="max-h-52 overflow-y-auto">
            {isFetching && (
              <div className="flex justify-center py-3">
                <Spinner label="Mencari pelanggan..." />
              </div>
            )}

            {pencarianSettle && !adaHasil && !nomorTampakValid && (
              <p className="px-3 py-3 text-center text-sm text-slate-500">
                Pelanggan tidak ditemukan. Ketik nomor WhatsApp yang valid untuk
                mendaftarkan pelanggan baru.
              </p>
            )}

            {adaHasil && (
              <ul className="divide-y divide-slate-100">
                {items.map((c) => (
                  <li key={c._id}>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          customer_id: c._id,
                          label: `${c.name} (${formatWhatsapp(c.whatsapp)})`,
                        })
                      }
                      className={cn(
                        "flex w-full flex-col items-start px-3 py-2 text-left text-sm",
                        "hover:bg-slate-50"
                      )}
                    >
                      <span className="font-medium text-slate-800">{c.name}</span>
                      <span className="text-xs text-slate-500">
                        {formatWhatsapp(c.whatsapp)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Form BERTAMBAH: tidak ada hasil & nomor valid → isian pelanggan
              baru muncul inline di sini. Konfirmasi membuat pelanggan (POST
              /customers) supaya galeri desain bisa langsung dipakai. */}
          {tawarkanBaru && (
            <div className="flex flex-col gap-3 border-t border-slate-100 bg-brand-50/40 p-3">
              <div className="text-sm">
                <p className="font-medium text-slate-700">
                  Pelanggan baru untuk {formatWhatsapp(nomorNormal)}
                </p>
                <p className="text-slate-500">
                  Nomor belum terdaftar — lengkapi namanya.
                </p>
              </div>

              <TextField
                label="Nama Pelanggan"
                placeholder="Nama lengkap"
                value={namaBaru}
                autoComplete="off"
                onChange={(e) => setNamaBaru(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    simpanPelangganBaru();
                  }
                }}
              />

              <button
                type="button"
                disabled={namaBaru.trim().length < 3 || createCustomer.isPending}
                className="self-start rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={simpanPelangganBaru}
              >
                {createCustomer.isPending
                  ? "Menyimpan..."
                  : "Gunakan pelanggan baru"}
              </button>

              {createCustomer.error?.message && (
                <p role="alert" className="text-xs text-danger-600">
                  {createCustomer.error.message}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

