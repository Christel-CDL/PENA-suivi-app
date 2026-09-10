import "server-only";
import type { Utilisateur } from "@/lib/airtable/users";
import type { Tache } from "@/lib/airtable/taches";

/**
 * Règles d'autorisation centrales — section 5 du cahier des charges.
 * Toute route serveur (Server Action ou Route Handler) doit passer par ces
 * fonctions avant de lire ou d'écrire une donnée. Rien ne doit être décidé
 * seulement dans l'interface : un Contributeur qui bricole une requête réseau
 * doit se heurter aux mêmes refus qu'un simple clic sur un bouton caché.
 */

export function isAdmin(user: Utilisateur): boolean {
  return user.role === "Admin";
}

/** Sites que cet utilisateur a le droit de voir. Admin : accès direct, pas de filtre. */
export function allowedSiteIds(user: Utilisateur): string[] | "all" {
  return isAdmin(user) ? "all" : user.siteIds;
}

/** Un enregistrement lié à un ou plusieurs sites est-il dans le périmètre de l'utilisateur ? */
export function canAccessSites(user: Utilisateur, siteIds: string[]): boolean {
  const allowed = allowedSiteIds(user);
  if (allowed === "all") return true;
  if (siteIds.length === 0) return false;
  return siteIds.some((id) => allowed.includes(id));
}

/**
 * Un Contributeur ne peut modifier que les champs d'une tâche dont il est le
 * Responsable (champ "Responsable (lien)", comparaison par ID d'enregistrement
 * CONTACTS — jamais par texte). L'Admin peut toujours modifier.
 */
export function canEditTask(user: Utilisateur, task: Pick<Tache, "responsableContactIds">): boolean {
  if (isAdmin(user)) return true;
  if (!user.contactId) return false;
  return task.responsableContactIds.includes(user.contactId);
}

/** Ajouter une entrée de journal / un commentaire : tout utilisateur ayant accès au site. */
export function canAddJournalEntry(user: Utilisateur, taskSiteIds: string[]): boolean {
  return canAccessSites(user, taskSiteIds);
}

/**
 * Modifier ou supprimer une entrée de journal : l'Admin peut toujours (ex.
 * corriger un rattachement erroné) ; un Contributeur seulement sur les
 * entrées dont il est l'auteur (son contact est dans "Contact associé").
 */
export function canEditJournalEntry(user: Utilisateur, entry: { contactIds: string[] }): boolean {
  if (isAdmin(user)) return true;
  if (!user.contactId) return false;
  return entry.contactIds.includes(user.contactId);
}

/** Seul l'Admin crée directement un sous-projet/une tâche ; un Contributeur passe par DEMANDES. */
export function canCreateDirectly(user: Utilisateur): boolean {
  return isAdmin(user);
}

export function assertAdmin(user: Utilisateur | null): asserts user is Utilisateur {
  if (!user || !isAdmin(user)) {
    throw new Error("Action réservée à l'administrateur.");
  }
}

export function assertSiteAccess(user: Utilisateur | null, siteIds: string[]): asserts user is Utilisateur {
  if (!user || !canAccessSites(user, siteIds)) {
    throw new Error("Vous n'avez pas accès à ce site.");
  }
}
