import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { loadDossier } from "@/lib/data/dossier";
import { filterDossierBySite } from "@/lib/site-filter";
import { SiteFilterTabs } from "@/components/SiteFilterTabs";
import { formatDate } from "@/lib/format";
import { aujourdhui, estOuvert, pointDepasse } from "@/lib/pilotage";
import { TACHE_STATUTS } from "@/lib/airtable/constants";
import { isAdmin, canEditTask } from "@/lib/auth/rbac";
import { NewTacheForm } from "./NewTacheForm";
import { NewSousProjetForm } from "./NewSousProjetForm";
import { TachesListe, type GroupeTaches } from "./TachesListe";
import type { Tache } from "@/lib/airtable/taches";

export default async function TachesPage({
  searchParams,
}: {
  searchParams: Promise<{
    site?: string;
    statut?: string;
    q?: string;
    priorite?: string;
    echeance?: string;
    termines?: string;
  }>;
}) {
  const user = (await getCurrentUser())!;
  const { site, statut, q, priorite, echeance, termines } = await searchParams;
  const fullDossier = await loadDossier(user);
  const dossier = filterDossierBySite(fullDossier, site);

  const contactsById = new Map(dossier.contacts.map((c) => [c.id, c]));
  const query = (q ?? "").trim().toLowerCase();
  const priorites = priorite ? priorite.split(",") : null;
  const today = aujourdhui();

  // Par défaut, les sujets terminés ou annulés sont masqués ; on les retrouve
  // avec la case « Afficher les terminés » ou en choisissant ce statut précis.
  // (« statut=tous » : ancien lien, toujours accepté.)
  const afficherClos = termines === "1" || statut === "tous";
  const statutPrecis = statut && statut !== "tous" ? statut : null;
  const masquerClos = !afficherClos && !statutPrecis;
  const filtreActif = Boolean(query || priorites || echeance || statutPrecis);
  let masquees = 0;

  const taches = dossier.taches.filter((t) => {
    if (statutPrecis && t.statut !== statutPrecis) return false;
    if (priorites && !priorites.includes(t.priorite)) return false;
    if (echeance === "depassee") {
      if (!t.echeance || t.echeance >= today || !estOuvert(t.statut)) return false;
    }
    if (query && !t.nom.toLowerCase().includes(query)) return false;
    if (masquerClos && !estOuvert(t.statut)) {
      masquees++;
      return false;
    }
    return true;
  });

  // Regroupement par volet (sous-projet). Le site vient de « Projet associé »
  // du volet ; le préfixe PM / PE du nom ne sert qu'à l'affichage.
  const tachesParVolet = new Map<string, Tache[]>();
  for (const t of taches) {
    const key = t.sousProjetIds[0] ?? "_sans";
    if (!tachesParVolet.has(key)) tachesParVolet.set(key, []);
    tachesParVolet.get(key)!.push(t);
  }
  const compteurs = new Map<string, { ouverts: number; clos: number }>();
  for (const t of dossier.taches) {
    const key = t.sousProjetIds[0] ?? "_sans";
    const c = compteurs.get(key) ?? { ouverts: 0, clos: 0 };
    if (estOuvert(t.statut)) c.ouverts++;
    else c.clos++;
    compteurs.set(key, c);
  }

  const sitesParId = new Map(fullDossier.sites.map((s) => [s.id, s.nom]));
  const siteNomDuVolet = (sp: { projetIds: string[] }) => (sp.projetIds[0] && sitesParId.get(sp.projetIds[0])) || "~";
  // Un volet « En attente » est un volet de veille : affiché en dernier, replié.
  const enVeille = (sp: { statut: string }) => sp.statut === "En attente";

  const volets = [...dossier.sousProjets].sort(
    (a, b) =>
      Number(enVeille(a)) - Number(enVeille(b)) ||
      siteNomDuVolet(a).localeCompare(siteNomDuVolet(b)) ||
      a.nom.localeCompare(b.nom),
  );
  const groupes = [
    // Sans filtre de recherche, tous les volets apparaissent (même sans sujet ouvert),
    // pour que les compteurs donnent une vue complète du dossier.
    ...volets
      .filter((sp) => tachesParVolet.has(sp.id) || !filtreActif)
      .map((sp) => ({ id: sp.id, nom: sp.nom, enVeille: enVeille(sp), taches: tachesParVolet.get(sp.id) ?? [] })),
    ...(tachesParVolet.has("_sans")
      ? [{ id: "_sans", nom: "Sans volet", enVeille: false, taches: tachesParVolet.get("_sans")! }]
      : []),
  ];

  const sousProjetsParId = new Map(fullDossier.sousProjets.map((sp) => [sp.id, sp]));

  // Données déjà mises en forme pour la liste interactive (composant client).
  const groupesAffiches: GroupeTaches[] = groupes.map((g) => ({
    id: g.id,
    nom: g.nom,
    enVeille: g.enVeille,
    nbOuverts: compteurs.get(g.id)?.ouverts ?? 0,
    nbClos: compteurs.get(g.id)?.clos ?? 0,
    taches: g.taches.map((t) => {
      const responsables = t.responsableContactIds.map((id) => contactsById.get(id)?.nom).filter(Boolean);
      const prestataires = t.prestataireContactIds.map((id) => contactsById.get(id)?.nom).filter(Boolean);
      return {
        id: t.id,
        nom: t.nom,
        priorite: t.priorite,
        statut: t.statut,
        responsables: responsables.join(", "),
        prestataire: prestataires.length > 0 ? prestataires.join(", ") : t.prestataireAncienTexte,
        echeanceLabel: t.echeance ? formatDate(t.echeance) : "",
        enRetard: Boolean(t.echeance) && t.echeance! < today && estOuvert(t.statut),
        prochaineEtape: t.prochaineEtape,
        balleChez: t.balleChez,
        prochainPointLabel: formatDate(t.prochainPoint),
        pointDepasse: pointDepasse(t.statut, t.prochainPoint),
        selectable: canEditTask(user, t),
        siteId: (sousProjetsParId.get(t.sousProjetIds[0])?.projetIds[0]) ?? null,
      };
    }),
  }));

  // Pour créer une tâche, tous les sous-projets doivent être proposés (regroupés
  // par site), quel que soit l'onglet de site actuellement affiché.
  const sousProjetsPourCreation = fullDossier.sousProjets.map((sp) => ({
    id: sp.id,
    nom: sp.nom,
    siteNom: (sp.projetIds[0] && sitesParId.get(sp.projetIds[0])) || "Sans site",
  }));

  const equipeProjetOptions = dossier.contacts
    .filter((c) => c.categories.includes("Équipe projet"))
    .map((c) => ({ id: c.id, label: c.organisation ? `${c.nom} (${c.organisation})` : c.nom }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Tâches</h1>
        <SiteFilterTabs sites={fullDossier.sites} />
      </div>

      {isAdmin(user) && (
        <div className="flex flex-wrap items-start gap-2">
          <NewTacheForm sousProjets={sousProjetsPourCreation} equipeProjetOptions={equipeProjetOptions} />
          <NewSousProjetForm sites={fullDossier.sites.map((s) => ({ id: s.id, nom: s.nom }))} />
        </div>
      )}

      <form className="flex flex-wrap gap-2" action="/taches">
        {site && <input type="hidden" name="site" value={site} />}
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Rechercher une tâche…"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <select
          name="statut"
          defaultValue={statutPrecis ?? ""}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          aria-label="Statut"
        >
          <option value="">Tous les statuts</option>
          {TACHE_STATUTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" name="termines" value="1" defaultChecked={afficherClos} />
          Afficher les terminés
        </label>
        <button type="submit" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white">
          Filtrer
        </button>
      </form>

      {(priorites || echeance === "depassee") && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span>
            Filtre actif : {priorites ? `priorité ${priorites.join(" ou ")}` : "échéances dépassées"}
          </span>
          <Link href={site ? `/taches?site=${site}` : "/taches"} className="text-slate-500 underline hover:text-slate-900">
            Réinitialiser
          </Link>
        </div>
      )}

      {masquees > 0 && (
        <p className="text-sm text-slate-500">
          {masquees} sujet{masquees > 1 ? "s" : ""} terminé{masquees > 1 ? "s" : ""} ou annulé{masquees > 1 ? "s" : ""}{" "}
          masqué{masquees > 1 ? "s" : ""} — cochez « Afficher les terminés » pour {masquees > 1 ? "les" : "le"} voir.
        </p>
      )}

      {taches.length === 0 && filtreActif && (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Aucune tâche ne correspond.
        </p>
      )}

      <TachesListe
        groupes={groupesAffiches}
        sousProjets={sousProjetsPourCreation}
        sites={fullDossier.sites.map((s) => ({ id: s.id, nom: s.nom }))}
        isAdmin={isAdmin(user)}
      />
    </div>
  );
}
