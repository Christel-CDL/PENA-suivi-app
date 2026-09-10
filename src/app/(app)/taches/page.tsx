import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { loadDossier } from "@/lib/data/dossier";
import { filterDossierBySite } from "@/lib/site-filter";
import { SiteFilterTabs } from "@/components/SiteFilterTabs";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, isOverdue } from "@/lib/format";
import { TACHE_STATUTS } from "@/lib/airtable/constants";
import { isAdmin } from "@/lib/auth/rbac";
import { NewTacheForm } from "./NewTacheForm";
import type { Tache } from "@/lib/airtable/taches";
import type { Contact } from "@/lib/airtable/contacts";

function TacheRow({ tache, contactsById }: { tache: Tache; contactsById: Map<string, Contact> }) {
  const responsables = tache.responsableContactIds.map((id) => contactsById.get(id)?.nom).filter(Boolean);
  const prestataires = tache.prestataireContactIds.map((id) => contactsById.get(id)?.nom).filter(Boolean);
  const prestataireLabel = prestataires.length > 0 ? prestataires.join(", ") : tache.prestataireAncienTexte;
  return (
    <Link href={`/taches/${tache.id}`} className="block p-4 hover:bg-slate-50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-slate-900">{tache.nom}</p>
        <div className="flex items-center gap-2">
          <StatusBadge value={tache.priorite} />
          <StatusBadge value={tache.statut} />
        </div>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
        {responsables.length > 0 && <span>Responsable : {responsables.join(", ")}</span>}
        {prestataireLabel && <span>Prestataire : {prestataireLabel}</span>}
        <span className={isOverdue(tache.echeance) && tache.statut !== "Terminé" ? "font-medium text-red-600" : ""}>
          Échéance : {formatDate(tache.echeance)}
        </span>
      </div>
    </Link>
  );
}

export default async function TachesPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; statut?: string; q?: string; priorite?: string; echeance?: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { site, statut, q, priorite, echeance } = await searchParams;
  const dossier = filterDossierBySite(await loadDossier(user), site);

  const contactsById = new Map(dossier.contacts.map((c) => [c.id, c]));
  const query = (q ?? "").trim().toLowerCase();
  const priorites = priorite ? priorite.split(",") : null;
  const today = new Date().toISOString().slice(0, 10);

  const taches = dossier.taches.filter((t) => {
    if (statut && t.statut !== statut) return false;
    if (priorites && !priorites.includes(t.priorite)) return false;
    if (echeance === "depassee") {
      if (!t.echeance || t.echeance >= today || t.statut === "Terminé" || t.statut === "Annulée") return false;
    }
    if (query && !t.nom.toLowerCase().includes(query)) return false;
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

  const equipeProjetOptions = dossier.contacts
    .filter((c) => c.categories.includes("Équipe projet"))
    .map((c) => ({ id: c.id, label: c.organisation ? `${c.nom} (${c.organisation})` : c.nom }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Tâches</h1>
        <SiteFilterTabs sites={dossier.sites} />
      </div>

      {isAdmin(user) && (
        <NewTacheForm sousProjets={dossier.sousProjets} equipeProjetOptions={equipeProjetOptions} />
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
          <option value="">Tous les statuts</option>
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

      {taches.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Aucune tâche ne correspond.
        </p>
      )}

      {groupes.map((groupe) => (
        <section key={groupe.id}>
          <h2 className="mb-2 text-lg font-semibold text-slate-800">
            {groupe.nom} <span className="text-sm font-normal text-slate-400">({groupe.taches.length})</span>
          </h2>
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {groupe.taches.map((t) => (
              <TacheRow key={t.id} tache={t} contactsById={contactsById} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
