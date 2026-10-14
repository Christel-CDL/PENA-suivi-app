import "server-only";
import { revalidatePath } from "next/cache";
import type { Utilisateur } from "@/lib/airtable/users";
import { canAddJournalEntry, canEditTask } from "@/lib/auth/rbac";
import { loadDossier } from "@/lib/data/dossier";
import { createJournalEntry } from "@/lib/airtable/journal";
import { getTache, updateTacheFields } from "@/lib/airtable/taches";
import { BALLE_CHEZ, TACHE_STATUTS, TYPES_COMPTE_RENDU } from "@/lib/airtable/constants";
import { champsManquants, messageChampsManquants } from "@/lib/pilotage";
import { lienDocumentValide } from "@/lib/format";

/**
 * Écritures « métier » partagées par l'application (formulaire de compte-rendu)
 * et le connecteur Claude (MCP) : un seul endroit pour les contrôles, pour que
 * les deux chemins appliquent exactement les mêmes règles.
 */

const LONGUEUR_MAX = 10000;

/** Champs du sujet à modifier ; un champ absent garde sa valeur actuelle. */
export type MajSujet = Partial<{ statut: string; prochaineEtape: string; balleChez: string; prochainPoint: string | null }>;

export type ResultatEcriture =
  | { ok: true; message: string; tacheId: string; sujetMisAJour: boolean }
  | { ok: false; message: string; tacheId?: string };

function rafraichir(tacheId: string) {
  revalidatePath(`/taches/${tacheId}`);
  revalidatePath("/taches");
  revalidatePath("/journal");
  revalidatePath("/");
}

/** Vérifie une mise à jour de sujet sans rien écrire : droits, statut, balle, règle des 3 champs. */
async function preparerMaj(user: Utilisateur, tacheId: string, maj: MajSujet) {
  const tache = await getTache(tacheId);
  if (!tache) return { ok: false as const, message: "Sujet introuvable." };
  if (!canEditTask(user, tache)) {
    return { ok: false as const, message: "Seul le responsable du sujet (ou l'administratrice) peut le mettre à jour." };
  }
  const statut = maj.statut ?? tache.statut;
  if (!(TACHE_STATUTS as readonly string[]).includes(statut)) {
    return { ok: false as const, message: `Statut inconnu. Valeurs possibles : ${TACHE_STATUTS.join(", ")}.` };
  }
  const balleChez = (maj.balleChez ?? tache.balleChez).trim();
  if (balleChez && !(BALLE_CHEZ as readonly string[]).includes(balleChez)) {
    return { ok: false as const, message: `« Balle chez » inconnu. Valeurs possibles : ${BALLE_CHEZ.join(", ")}.` };
  }
  const prochainPoint = maj.prochainPoint === undefined ? tache.prochainPoint : maj.prochainPoint || null;
  if (prochainPoint && !/^\d{4}-\d{2}-\d{2}$/.test(prochainPoint)) {
    return { ok: false as const, message: "Prochain point : date attendue au format AAAA-MM-JJ." };
  }
  const pilotage = { prochaineEtape: (maj.prochaineEtape ?? tache.prochaineEtape).trim(), balleChez, prochainPoint };
  const manquants = champsManquants(statut, pilotage);
  if (manquants.length > 0) return { ok: false as const, message: messageChampsManquants(manquants) };
  return { ok: true as const, champs: { statut, ...pilotage } };
}

export async function enregistrerCompteRendu(
  user: Utilisateur,
  input: {
    tacheId: string;
    origine: string;
    description: string;
    /** ISO 8601 ; null = maintenant. */
    dateIso: string | null;
    lienDocument: string;
    participantIds: string[];
    /** null = compte-rendu seul, sans toucher au sujet. */
    maj: MajSujet | null;
    /** Ajoutée à la fin du texte (ex. « (saisi via Claude) »). */
    mention?: string;
  },
): Promise<ResultatEcriture> {
  const { tacheId } = input;
  const description = input.description.trim();
  if (!tacheId) return { ok: false, message: "Choisissez le volet puis le sujet concerné." };
  if (!(TYPES_COMPTE_RENDU as readonly string[]).includes(input.origine)) {
    return { ok: false, message: `Type inconnu. Valeurs possibles : ${TYPES_COMPTE_RENDU.join(", ")}.` };
  }
  if (!description) return { ok: false, message: "Le texte du compte-rendu est vide." };
  if (description.length > LONGUEUR_MAX) return { ok: false, message: `Texte trop long (${LONGUEUR_MAX} caractères maximum).` };

  const lien = input.lienDocument.trim() ? lienDocumentValide(input.lienDocument) : "";
  if (lien === null) return { ok: false, message: "Le lien du document doit être une adresse web complète (https://…)." };

  // Périmètre de site : le sujet doit être visible par cet utilisateur.
  const dossier = await loadDossier(user);
  if (!dossier.taches.some((t) => t.id === tacheId) || !canAddJournalEntry(user, dossier.taskSiteIds.get(tacheId) ?? [])) {
    return { ok: false, message: "Vous n'avez pas accès à ce sujet." };
  }
  // Participants : seulement des contacts du périmètre (pas d'ID arbitraire injecté).
  const contactsVisibles = new Set(dossier.contacts.map((c) => c.id));
  const participantIds = [...new Set(input.participantIds)].filter((id) => contactsVisibles.has(id));

  // Mise à jour du sujet contrôlée AVANT toute écriture : jamais de compte-rendu à moitié enregistré.
  let champs = null;
  if (input.maj) {
    const prep = await preparerMaj(user, tacheId, input.maj);
    if (!prep.ok) {
      // Le message des 3 champs commence déjà par « Non enregistré » : ne pas le répéter.
      return { ok: false, message: prep.message.startsWith("Non enregistré") ? prep.message : `Rien n'a été enregistré : ${prep.message}` };
    }
    champs = prep.champs;
  }

  await createJournalEntry({
    description: input.mention ? `${description}\n\n${input.mention}` : description,
    tacheIds: [tacheId],
    // Contact associé = l'auteur (donne le droit de modifier l'entrée) ; les présents vont dans Participants.
    contactIds: user.contactId ? [user.contactId] : [],
    origine: input.origine,
    date: input.dateIso ?? new Date().toISOString(),
    participantIds,
    lienDocument: lien,
  });

  if (champs) {
    try {
      await updateTacheFields(tacheId, champs);
    } catch {
      revalidatePath("/journal");
      return {
        ok: false,
        message: "Compte-rendu enregistré dans le journal, mais la mise à jour du sujet a échoué. Réessayez depuis la fiche du sujet.",
        tacheId,
      };
    }
  }

  rafraichir(tacheId);
  return {
    ok: true,
    message: champs ? "Enregistré : compte-rendu ajouté au journal et sujet mis à jour." : "Enregistré dans le journal.",
    tacheId,
    sujetMisAJour: Boolean(champs),
  };
}

/** Mise à jour du pilotage d'un sujet (sans compte-rendu). */
export async function mettreAJourSujet(user: Utilisateur, tacheId: string, maj: MajSujet): Promise<ResultatEcriture> {
  const dossier = await loadDossier(user);
  if (!dossier.taches.some((t) => t.id === tacheId)) return { ok: false, message: "Sujet introuvable ou hors de votre périmètre." };
  const prep = await preparerMaj(user, tacheId, maj);
  if (!prep.ok) return { ok: false, message: prep.message };
  await updateTacheFields(tacheId, prep.champs);
  rafraichir(tacheId);
  return { ok: true, message: "Sujet mis à jour.", tacheId, sujetMisAJour: true };
}
