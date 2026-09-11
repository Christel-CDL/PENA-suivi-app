import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { loadDossier } from "@/lib/data/dossier";
import { filterDossierBySite } from "@/lib/site-filter";
import { SiteFilterTabs } from "@/components/SiteFilterTabs";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { site } = await searchParams;
  const fullDossier = await loadDossier(user);
  const dossier = filterDossierBySite(fullDossier, site);

  const avecEcheance = dossier.taches
    .filter((t) => t.echeance)
    .sort((a, b) => (a.echeance! < b.echeance! ? -1 : 1));

  const groupes = new Map<string, typeof avecEcheance>();
  for (const t of avecEcheance) {
    const d = new Date(t.echeance!);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groupes.has(key)) groupes.set(key, []);
    groupes.get(key)!.push(t);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Planning</h1>
        <SiteFilterTabs sites={fullDossier.sites} />
      </div>

      {groupes.size === 0 && <p className="text-sm text-slate-500">Aucune tâche avec échéance.</p>}

      {[...groupes.entries()].map(([key, taches]) => {
        const [year, month] = key.split("-").map(Number);
        return (
          <section key={key}>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              {MOIS[month - 1]} {year}
            </h2>
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {taches.map((t) => (
                <Link key={t.id} href={`/taches/${t.id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm hover:bg-slate-50">
                  <span className="text-slate-800">{t.nom}</span>
                  <span className="flex items-center gap-2">
                    <StatusBadge value={t.statut} />
                    <span className="text-slate-500">{formatDate(t.echeance)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
