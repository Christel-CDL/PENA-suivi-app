import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { loadDossier } from "@/lib/data/dossier";
import { filterDossierBySite } from "@/lib/site-filter";
import { SiteFilterTabs } from "@/components/SiteFilterTabs";
import { formatDate, isOverdue } from "@/lib/format";
import { TACHE_STATUTS } from "@/lib/airtable/constants";
import { isAdmin, canEditTask } from "@/lib/auth/rbac";
import { NewTacheForm } from "./NewTacheForm";
import { NewSousProjetForm } from "./NewSousProjetForm";
import { TachesListe, type GroupeTaches } from "./TachesListe";
import type { Tache } from "@/lib/airtable/taches";

export default async function TachesPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; statut?: string; q?: string; priorite?: string; echeance?: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { site, statut, q, priorite, echeance } = await searchParams;
  const fullDossier = await loadDossier(user);
  const dossier = filterDossierBySite(fullDossier, site);

  const contactsById = new Map(dossier.contacts.map((c) => [c.id, c]));
  const query = (q ?? "").trim().toLowerCase();
  const priorites = priorite ? priorite.split(",") : null;
  const today = new Date().toISOString().slice(0, 10);

  // Par défaut (aucun statut choisi), les tâches terminées ou annulées sont
  // masquées ; on les retrouve avec le filtre de statut ("Tous" ou un statut précis).
  const masquerCloturees = !statut;
  let masquees = 0;

  const taches = dossier.taches.filter((t) => {
    if (statut && statut !== "tous" && t.statut !== statut) return false;
    if (priorites && !priorites.includes(t.priorite)) return false;
    if (echeance === "depassee") {
      if (!t.echeance || t.echeance >= today || t.statut === "Terminé" || t.statut === "Annulée") return false;
    }
    if (query && !t.nom.toLowerCase().includes(query)) return false;
    if (masquerCloturees && (t.statut === "Terminé" || t.statut === "Annulée")) {
      masquees++;
      return false;
    }
    return true;
  });

  // Regroupement par sous-projet, dans l'ordre où les sous-projets apparaissent
  // dans le dossier ; les tâches sans sous-projet associé arrivent en dernier.
  const tachesBySousProjet = new Map<string, Tache[]>();
  for (const t of taches) {
    const key = t.sousProjetIds[0] ?? "_sans";
    if (!tachesBySousProjet.has(key)) tachesBySousProjet.set(key, []);
    tachesBySousProjet.get(key)!.push(t);
  }
  const groupes = [
    ...dossier.sousProjets
      .filter((sp) => tachesBySousProjet.has(sp.id))
      .map((sp) => ({ id: sp.id, nom: sp.nom, taches: tachesBySousProjet.get(sp.id)! })),
    ...(tachesBySousProjet.has("_sans")
      ? [{ id: "_sans", nom: "Sans sous-projet", taches: tachesBySousProjet.get("_sans")! }]
      : []),
  ];

  const sousProjetsParId = new Map(fullDossier.sousProjets.map((sp) => [sp.id, sp]));

  // Données déjà mises en forme pour la liste interactive (composant client).
  const groupesAffiches: GroupeTaches[] = groupes.map((g) => ({
    id: g.id,
    nom: g.nom,
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
        echeanceLabel: formatDate(t.echeance),
        enRetard: isOverdue(t.echeance) && t.statut !== "Terminé",
        selectable: canEditTask(user, t),
        siteId: (sousProjetsParId.get(t.sousProjetIds[0])?.projetIds[0]) ?? null,
      };
    }),
  }));

  // Pour créer une tâche, tous les sous-projets doivent être proposés (regroupés
  // par site), quel que soit l'onglet de site actuellement affiché.
  const sitesParId = new Map(fullDossier.sites.map((s) => [s.id, s.nom]));
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
        <select name="statut" defaultValue={statut ?? ""} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Tâches en cours de suivi</option>
          <option value="tous">Tous les statuts (y compris terminées et annulées)</option>
          {TACHE_STATUTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
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
          {masquees} tâche{masquees > 1 ? "s" : ""} terminée{masquees > 1 ? "s" : ""} ou annulée{masquees > 1 ? "s" : ""}{" "}
          masquée{masquees > 1 ? "s" : ""} — choisissez « Tous les statuts » dans le filtre pour les afficher.
        </p>
      )}

      {taches.length === 0 && (
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
