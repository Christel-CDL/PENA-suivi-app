import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { loadDossier } from "@/lib/data/dossier";
import { filterDossierBySite } from "@/lib/site-filter";
import { SiteFilterTabs } from "@/components/SiteFilterTabs";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import type { Tache } from "@/lib/airtable/taches";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function moisKey(dateIso: string) {
  const d = new Date(dateIso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type JourEntry = { date: string; sites: string[]; taches: Tache[] };

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { site } = await searchParams;
  const fullDossier = await loadDossier(user);
  const dossier = filterDossierBySite(fullDossier, site);

  const today = new Date().toISOString().slice(0, 10);
  const sitesById = new Map(dossier.sites.map((s) => [s.id, s.nom]));

  const avecEcheance = dossier.taches.filter((t) => t.echeance && t.echeance! >= today);

  // Jours de présence sur site, synchronisés depuis le calendrier Outlook de
  // Christel par le workflow n8n dédié (voir deploy/n8n-workflow-planning-calendrier.json).
  const joursSurSite = dossier.planningVisites.filter((v) => v.date >= today);

  // Une seule liste triée par date : jours sur site et échéances de tâches
  // apparaissent sur la même ligne quand ils tombent le même jour, plutôt que
  // dans deux colonnes indépendantes difficiles à recaler visuellement.
  const parDate = new Map<string, JourEntry>();
  function entryFor(date: string): JourEntry {
    let e = parDate.get(date);
    if (!e) {
      e = { date, sites: [], taches: [] };
      parDate.set(date, e);
    }
    return e;
  }
  for (const v of joursSurSite) {
    const e = entryFor(v.date);
    for (const id of v.siteIds) {
      const nom = sitesById.get(id) ?? id;
      if (!e.sites.includes(nom)) e.sites.push(nom);
    }
  }
  for (const t of avecEcheance) {
    entryFor(t.echeance!).taches.push(t);
  }

  const parMois = new Map<string, JourEntry[]>();
  for (const e of parDate.values()) {
    const key = moisKey(e.date);
    if (!parMois.has(key)) parMois.set(key, []);
    parMois.get(key)!.push(e);
  }
  for (const entries of parMois.values()) entries.sort((a, b) => (a.date < b.date ? -1 : 1));
  const moisTries = [...parMois.keys()].sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Planning</h1>
        <SiteFilterTabs sites={fullDossier.sites} />
      </div>

      {moisTries.length === 0 && (
        <p className="text-sm text-slate-500">Rien à afficher pour l&apos;instant.</p>
      )}

      {moisTries.map((key) => {
        const [year, month] = key.split("-").map(Number);
        return (
          <section key={key}>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              {MOIS[month - 1]} {year}
            </h2>
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {parMois.get(key)!.map((e) => (
                <div key={e.date} className="flex flex-wrap items-start justify-between gap-2 p-3 text-sm">
                  <span className="w-24 shrink-0 text-slate-800">{formatDate(e.date)}</span>
                  <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                    {e.sites.map((nom) => (
                      <span key={nom} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {nom}
                      </span>
                    ))}
                    {e.taches.map((t) => (
                      <Link
                        key={t.id}
                        href={`/taches/${t.id}`}
                        className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <StatusBadge value={t.statut} />
                        {t.nom}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
