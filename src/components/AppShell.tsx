import Link from "next/link";
import type { Utilisateur } from "@/lib/airtable/users";
import { isAdmin } from "@/lib/auth/rbac";
import { AutoRefresh } from "./AutoRefresh";

const NAV_ITEMS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/taches", label: "Tâches" },
  { href: "/planning", label: "Planning" },
  { href: "/journal", label: "Journal" },
  { href: "/contacts", label: "Contacts" },
  { href: "/demandes", label: "Demandes" },
];

export function AppShell({ user, children }: { user: Utilisateur; children: React.ReactNode }) {
  const nav = isAdmin(user) ? [...NAV_ITEMS, { href: "/entrees-a-valider", label: "Entrées à valider" }] : NAV_ITEMS;

  return (
    <div className="flex min-h-screen flex-col">
      <AutoRefresh intervalMs={20000} />

      <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center text-xs text-amber-800">
        Usage réservé aux parties prenantes du dossier PENA — confidentiel, ne pas diffuser.
      </div>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold text-slate-900">Suivi ICPE — PENA</span>
            <nav className="flex flex-wrap gap-4 text-sm">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="text-slate-600 hover:text-slate-900">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>
              {user.nom} · <span className="text-slate-400">{isAdmin(user) ? "Admin" : "Contributeur"}</span>
            </span>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="text-slate-500 hover:text-slate-900 underline">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
