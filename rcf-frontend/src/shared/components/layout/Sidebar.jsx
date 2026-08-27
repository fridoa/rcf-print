import { NavLink, Link } from "react-router-dom";
import { Button } from "@/shared/components/ui";
import { ROLE_LABEL } from "@/shared/constants/roles";
import { ROUTES } from "@/shared/constants/routes";
import { cn } from "@/shared/lib/cn";
import logoUrl from "@/assets/images/logo.jpg";

/**
 * Sidebar navigasi utama (menggantikan tab horizontal di AppLayout).
 *
 * Presentational: menerima daftar menu yang SUDAH difilter per-role dari
 * pemanggil (AppLayout), plus data user & handler logout. Dengan begitu
 * komponen ini gampang dites tanpa AuthProvider dan tidak tahu-menahu soal
 * aturan role — satu tanggung jawab: menyusun tampilan navigasi.
 *
 * Menu boleh dikelompokkan: item dengan `group` sama dirender di bawah satu
 * judul seksi, urut sesuai kemunculan pertama. Tiap item boleh membawa `icon`
 * (komponen lucide-react) yang dirender di kiri label.
 *
 * @param {object}   props
 * @param {Array}    props.items    [{ to, label, icon?, group? }] terfilter role
 * @param {object}   props.user     { name, role }
 * @param {Function} props.onLogout
 * @param {Function} [props.onNavigate]  dipanggil saat item diklik (mis. tutup
 *                                       drawer di mobile)
 */
export function Sidebar({ items = [], user, onLogout, onNavigate }) {
  // Kelompokkan item per `group` sambil menjaga urutan kemunculan pertama.
  const sections = [];
  const indexByGroup = new Map();
  for (const item of items) {
    const key = item.group ?? "";
    if (!indexByGroup.has(key)) {
      indexByGroup.set(key, sections.length);
      sections.push({ group: key, items: [] });
    }
    sections[indexByGroup.get(key)].items.push(item);
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-hairline bg-white">
      {/* Brand */}
      <div className="flex items-center justify-center border-b border-hairline px-5 py-5">
        <Link to={ROUTES.dashboard} onClick={onNavigate} aria-label="RCF Print — beranda">
          <img
            src={logoUrl}
            alt="Logo RCF Print"
            className="size-20 shrink-0 rounded-xl object-cover"
          />
        </Link>
      </div>

      {/* Navigasi */}
      <nav
        aria-label="Navigasi utama"
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        {sections.map((section) => (
          <div key={section.group || "_"} className="mb-4 last:mb-0">
            {section.group && (
              <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.group}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                          isActive
                            ? "bg-brand-50 text-brand-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )
                      }
                    >
                      {Icon && (
                        <Icon aria-hidden="true" className="size-[18px] shrink-0" />
                      )}
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: identitas user + logout */}
      <div className="border-t border-hairline p-3">
        <Link
          to={ROUTES.profile}
          onClick={onNavigate}
          className="block rounded-lg px-3 py-2 hover:bg-slate-50"
        >
          <span className="block truncate text-sm font-medium text-slate-800">
            {user?.name ?? "Pengguna"}
          </span>
          {user?.role && (
            <span className="block text-xs text-slate-400">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          )}
        </Link>

        <Button
          variant="secondary"
          size="sm"
          onClick={onLogout}
          className="mt-2 w-full"
        >
          Keluar
        </Button>
      </div>
    </aside>
  );
}
