import Link from "next/link";
import type { ReactNode } from "react";
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

function moisKey(dateIso: string) {
  const d = new Date(dateIso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

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

  const avecEcheance = dossier.taches
    .filter((t) => t.echeance && t.echeance >= today)
    .sort((a, b) => (a.echeance! < b.echeance! ? -1 : 1));

  // Jours de présence sur site, synchronisés depuis le calendrier Outlook de
  // Christel par le workflow n8n dédié (voir deploy/n8n-workflow-planning-calendrier.json).
  const joursSurSite = dossier.planningVisites
    .filter((v) => v.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  // Un seul regroupement par mois, pour afficher jours sur site et échéances
  // côte à côte plutôt qu'en deux longues listes séparées (moins lisible).
  const moisKeys = new Set<string>([...avecEcheance.map((t) => moisKey(t.echeance!)), ...joursSurSite.map((v) => moisKey(v.date))]);
  const moisTries = [...moisKeys].sort();

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
        const joursMois = joursSurSite.filter((v) => moisKey(v.date) === key);
        const tachesMois = avecEcheance.filter((t) => moisKey(t.echeance!) === key);

        return (
          <section key={key}>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              {MOIS[month - 1]} {year}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <PlanningColumn titre="Jours sur site" vide="Aucun jour sur site ce mois-ci.">
                {joursMois.map((v) => (
                  <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <span className="text-slate-800">{formatDate(v.date)}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {v.siteIds.map((id) => (
                        <span key={id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          {sitesById.get(id) ?? id}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </PlanningColumn>

              <PlanningColumn titre="Échéances des tâches" vide="Aucune échéance ce mois-ci.">
                {tachesMois.map((t) => (
                  <Link
                    key={t.id}
                    href={`/taches/${t.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm hover:bg-slate-50"
                  >
                    <span className="text-slate-800">{t.nom}</span>
                    <span className="flex items-center gap-2">
                      <StatusBadge value={t.statut} />
                      <span className="text-slate-500">{formatDate(t.echeance)}</span>
                    </span>
                  </Link>
                ))}
              </PlanningColumn>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PlanningColumn({
  titre,
  vide,
  children,
}: {
  titre: string;
  vide: string;
  children: ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">{titre}</h3>
      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {hasChildren ? children : <p className="p-4 text-sm text-slate-500">{vide}</p>}
      </div>
    </div>
  );
}
