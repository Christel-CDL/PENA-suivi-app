import "server-only";
import { listSites, type Site } from "@/lib/airtable/sites";
import { listSousProjets, type SousProjet } from "@/lib/airtable/sous-projets";
import { listTaches, type Tache } from "@/lib/airtable/taches";
import { listJournalEntries, type JournalEntry } from "@/lib/airtable/journal";
import { listContacts, type Contact } from "@/lib/airtable/contacts";
import { listDocuments, type DocumentCr } from "@/lib/airtable/documents";
import { listPlanningVisites, type VisitePlanning } from "@/lib/airtable/planning-visites";
import type { Utilisateur } from "@/lib/airtable/users";
import { allowedSiteIds } from "@/lib/auth/rbac";

export type Dossier = {
  sites: Site[];
  sousProjets: SousProjet[];
  taches: Tache[];
  journal: JournalEntry[];
  contacts: Contact[];
  documents: DocumentCr[];
  planningVisites: VisitePlanning[];
  /** Sites (IDs) associés à chaque tâche, via son (ses) sous-projet(s). */
  taskSiteIds: Map<string, string[]>;
};

function intersects(a: string[], b: string[] | "all"): boolean {
  if (b === "all") return true;
  return a.some((id) => b.includes(id));
}

/**
 * Charge tout le dossier, déjà filtré au périmètre de site de l'utilisateur
 * connecté. C'est le point d'entrée unique utilisé par les pages — il garantit
 * qu'aucune page n'oublie le filtrage par site (exigence non négociable, section 5).
 */
export async function loadDossier(user: Utilisateur): Promise<Dossier> {
  const [allSites, allSousProjets, allTaches, allJournal, allContacts, allDocuments, allPlanningVisites] =
    await Promise.all([
      listSites(),
      listSousProjets(),
      listTaches(),
      listJournalEntries(),
      listContacts(),
      listDocuments(),
      listPlanningVisites(),
    ]);

  const scope = allowedSiteIds(user);

  const sites = scope === "all" ? allSites : allSites.filter((s) => scope.includes(s.id));
  const visibleSiteIds = new Set(sites.map((s) => s.id));

  const sousProjets = allSousProjets.filter((sp) => sp.projetIds.some((id) => visibleSiteIds.has(id)));
  const visibleSousProjetIds = new Set(sousProjets.map((sp) => sp.id));

  const taches = allTaches.filter((t) => t.sousProjetIds.some((id) => visibleSousProjetIds.has(id)));
  const visibleTacheIds = new Set(taches.map((t) => t.id));

  const taskSiteIds = new Map<string, string[]>();
  const sousProjetSiteIds = new Map(allSousProjets.map((sp) => [sp.id, sp.projetIds]));
  for (const tache of allTaches) {
    const ids = new Set<string>();
    for (const spId of tache.sousProjetIds) {
      for (const siteId of sousProjetSiteIds.get(spId) ?? []) ids.add(siteId);
    }
    taskSiteIds.set(tache.id, [...ids]);
  }

  // Une entrée sans tâche liée (ex. e-mail automatique sans correspondance
  // trouvée) n'a aucune info de site rattachée : on ne peut pas l'attribuer
  // à un site précis pour un Contributeur limité, donc on la lui masque par
  // prudence. Pour un Admin ("all"), rien ne doit jamais disparaître.
  const journal =
    scope === "all" ? allJournal : allJournal.filter((j) => j.tacheIds.some((id) => visibleTacheIds.has(id)));
  const contacts = allContacts.filter((c) => intersects(c.projetIds, scope));
  const documents = allDocuments.filter((d) => intersects(d.projetIds, scope));
  const planningVisites = allPlanningVisites.filter((v) => intersects(v.siteIds, scope));

  return { sites, sousProjets, taches, journal, contacts, documents, planningVisites, taskSiteIds };
}
