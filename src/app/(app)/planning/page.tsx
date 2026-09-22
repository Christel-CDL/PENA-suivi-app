import { getCurrentUser } from "@/lib/auth/session";
import { loadDossier } from "@/lib/data/dossier";
import { filterDossierBySite } from "@/lib/site-filter";
import { SiteFilterTabs } from "@/components/SiteFilterTabs";
import { PlanningCalendrier, type JourCalendrier } from "./PlanningCalendrier";

const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const SEMAINES_MIN = 8; // fenêtre minimale affichée même sans rien de prévu
const SEMAINES_MAX = 52; // plafond, pour ne pas générer une plage sans fin

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Lundi de la semaine contenant `d` (ISO 8601 : la semaine commence le lundi). */
function lundiDeLaSemaine(d: Date) {
  const jourSemaineISO = (d.getDay() + 6) % 7; // 0 = lundi … 6 = dimanche
  const lundi = new Date(d);
  lundi.setDate(d.getDate() - jourSemaineISO);
  return lundi;
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

  const today = toISODate(new Date());
  const sitesById = new Map(dossier.sites.map((s) => [s.id, s.nom]));

  const avecEcheance = dossier.taches.filter((t) => t.echeance && t.echeance! >= today);
  // Jours de présence sur site, synchronisés depuis le calendrier Outlook de
  // Christel par le workflow n8n dédié (voir deploy/n8n-workflow-planning-calendrier.json).
  const joursSurSite = dossier.planningVisites.filter((v) => v.date >= today);

  const parDate = new Map<string, { sites: string[]; taches: { id: string; nom: string; statut: string }[] }>();
  function entryFor(date: string) {
    let e = parDate.get(date);
    if (!e) {
      e = { sites: [], taches: [] };
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
    entryFor(t.echeance!).taches.push({ id: t.id, nom: t.nom, statut: t.statut });
  }

  // La plage affichée s'étend au moins SEMAINES_MIN au-delà d'aujourd'hui, et
  // jusqu'à la date la plus lointaine ayant un jour sur site ou une échéance,
  // plafonnée à SEMAINES_MAX pour ne pas générer une plage sans fin.
  const dateLaPlusLointaine = [...parDate.keys()].sort().at(-1);
  const debut = lundiDeLaSemaine(new Date());
  const nbSemaines = dateLaPlusLointaine
    ? Math.min(SEMAINES_MAX, Math.max(SEMAINES_MIN, Math.ceil((+new Date(dateLaPlusLointaine) - +debut) / (7 * 86400000)) + 1))
    : SEMAINES_MIN;

  const jours: JourCalendrier[] = [];
  for (let i = 0; i < nbSemaines * 7; i++) {
    const d = new Date(debut);
    d.setDate(debut.getDate() + i);
    const iso = toISODate(d);
    const entry = parDate.get(iso);
    jours.push({
      date: iso,
      jour: JOURS_SEMAINE[(d.getDay() + 6) % 7],
      numero: String(d.getDate()).padStart(2, "0"),
      moisLabel: i === 0 || d.getDate() === 1 ? MOIS[d.getMonth()] : null,
      estAujourdhui: iso === today,
      weekEnd: d.getDay() === 0 || d.getDay() === 6,
      sites: entry?.sites ?? [],
      taches: entry?.taches ?? [],
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Planning</h1>
        <SiteFilterTabs sites={fullDossier.sites} />
      </div>

      <PlanningCalendrier jours={jours} />
    </div>
  );
}
