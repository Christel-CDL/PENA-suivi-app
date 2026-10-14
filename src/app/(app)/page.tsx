import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { loadDossier } from "@/lib/data/dossier";
import { filterDossierBySite } from "@/lib/site-filter";
import { SiteFilterTabs } from "@/components/SiteFilterTabs";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { isAdmin } from "@/lib/auth/rbac";
import { pointDepasse } from "@/lib/pilotage";
import { VUES, vuesPilotage, type VueId } from "@/lib/pilotage-vues";

const AIDE: Record<VueId, { admin: string; contributeur: string }> = {
  "a-moi": {
    admin: "Sujets ouverts où la balle est chez vous.",
    contributeur: "Vos sujets où la balle est chez PENA.",
  },
  "j-attends": {
    admin: "Sujets ouverts où la balle est chez PENA, un prestataire ou l'administration.",
    contributeur: "Vos sujets où la balle est chez Christel, un prestataire ou l'administration.",
  },
  "en-retard": {
    admin: "Sujets ouverts dont le prochain point est dépassé.",
    contributeur: "Sujets ouverts de vos sites dont le prochain point est dépassé.",
  },
  "cette-semaine": {
    admin: "Sujets ouverts dont le prochain point tombe dans les 7 prochains jours.",
    contributeur: "Sujets ouverts de vos sites dont le prochain point tombe dans les 7 prochains jours.",
  },
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; vue?: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { site, vue } = await searchParams;
  const fullDossier = await loadDossier(user);
  const dossier = filterDossierBySite(fullDossier, site);
  const admin = isAdmin(user);

  const vues = vuesPilotage(user, dossier.taches);
  const vueActive: VueId = VUES.some((v) => v.id === vue) ? (vue as VueId) : "a-moi";
  const lignes = vues[vueActive];

  const voletParId = new Map(fullDossier.sousProjets.map((sp) => [sp.id, sp.nom]));
  const contactParId = new Map(fullDossier.contacts.map((c) => [c.id, c.nom]));

  const hrefVue = (id: VueId) => {
    const params = new URLSearchParams();
    if (site) params.set("site", site);
    params.set("vue", id);
    return `/?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Tableau de bord</h1>
        <SiteFilterTabs sites={fullDossier.sites} />
      </div>

      <nav className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Vues de pilotage">
        {VUES.map((v) => {
          const active = v.id === vueActive;
          const alerte = v.id === "en-retard" && vues[v.id].length > 0;
          return (
            <Link
              key={v.id}
              href={hrefVue(v.id)}
              aria-current={active ? "page" : undefined}
              className={`block rounded-lg border p-4 ${
                active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <p className={`text-2xl font-semibold ${!active && alerte ? "text-red-600" : ""}`}>{vues[v.id].length}</p>
              <p className={`text-sm ${active ? "text-slate-200" : "text-slate-500"}`}>{v.label}</p>
            </Link>
          );
        })}
      </nav>

      <section>
        <p className="mb-2 text-sm text-slate-500">{AIDE[vueActive][admin ? "admin" : "contributeur"]}</p>
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {lignes.length === 0 && <p className="p-4 text-sm text-slate-500">Aucun sujet dans cette vue.</p>}
          {lignes.map((t) => {
            const depasse = pointDepasse(t.statut, t.prochainPoint);
            const responsables = t.responsableContactIds.map((id) => contactParId.get(id)).filter(Boolean).join(", ");
            return (
              <Link key={t.id} href={`/taches/${t.id}`} className="block p-3 text-sm hover:bg-slate-50">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-900">{t.nom}</span>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    {t.balleChez && <StatusBadge value={t.balleChez} />}
                    <span className={depasse ? "font-semibold text-red-600" : "text-slate-600"}>
                      {formatDate(t.prochainPoint)}
                    </span>
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {t.sousProjetIds.map((id) => voletParId.get(id)).filter(Boolean).join(", ") || "Sans volet"}
                  {responsables && ` · Responsable : ${responsables}`}
                </p>
                {t.prochaineEtape && (
                  <p className="mt-1 whitespace-pre-wrap text-slate-700">
                    <span className="text-slate-400">Prochaine étape : </span>
                    {t.prochaineEtape}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Sites suivis</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {dossier.sites.map((s) => (
            <Link
              key={s.id}
              href={`/?site=${s.id}`}
              className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 hover:bg-slate-50"
            >
              <p className="font-medium text-slate-900">{s.nom}</p>
              <p className="text-sm text-slate-500">{s.regime}</p>
              <div className="mt-2">
                <StatusBadge value={s.statut} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
