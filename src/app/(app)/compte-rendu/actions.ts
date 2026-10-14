"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { canAddJournalEntry, canEditTask } from "@/lib/auth/rbac";
import { loadDossier } from "@/lib/data/dossier";
import { createJournalEntry } from "@/lib/airtable/journal";
import { getTache, updateTacheFields } from "@/lib/airtable/taches";
import { TACHE_STATUTS } from "@/lib/airtable/constants";
import { lirePilotage, champsManquants, messageChampsManquants } from "@/lib/pilotage";
import { parisLocalVersIso, lienDocumentValide } from "@/lib/format";
import { TYPES_COMPTE_RENDU } from "./types";

export type CompteRenduState = {
  status: "idle" | "success" | "error";
  message?: string;
  tacheId?: string;
};

const LONGUEUR_MAX = 10000;

/**
 * Compte-rendu ou action saisi directement (brief v2, §1.4). Admin et
 * Contributeur écrivent directement dans le JOURNAL, comme pour un
 * commentaire ; la mise à jour du sujet, elle, exige d'en être responsable
 * (ou Admin). Tout est revérifié ici, quel que soit ce que l'écran a affiché.
 * La confirmation n'est renvoyée qu'après la réponse d'Airtable.
 */
export async function creerCompteRenduAction(_prev: CompteRenduState, formData: FormData): Promise<CompteRenduState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée, reconnectez-vous." };

  const tacheId = String(formData.get("tacheId") ?? "");
  const origine = String(formData.get("origine") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const dateSaisie = String(formData.get("date") ?? "");
  const lienSaisi = String(formData.get("lienDocument") ?? "").trim();

  if (!tacheId) return { status: "error", message: "Choisissez le volet puis le sujet concerné." };
  if (!(TYPES_COMPTE_RENDU as readonly string[]).includes(origine)) {
    return { status: "error", message: "Choisissez le type (visite, réunion, point dossier ou autre)." };
  }
  if (!description) return { status: "error", message: "Le texte du compte-rendu est vide." };
  if (description.length > LONGUEUR_MAX) {
    return { status: "error", message: `Texte trop long (${LONGUEUR_MAX} caractères maximum).` };
  }

  const date = dateSaisie ? parisLocalVersIso(dateSaisie) : new Date().toISOString();
  if (!date) return { status: "error", message: "Date ou heure invalide." };

  const lienDocument = lienSaisi ? lienDocumentValide(lienSaisi) : "";
  if (lienDocument === null) {
    return { status: "error", message: "Le lien du document doit être une adresse web complète (https://…)." };
  }

  // Périmètre de site : le sujet doit être visible par cet utilisateur.
  const dossier = await loadDossier(user);
  if (!dossier.taches.some((t) => t.id === tacheId) || !canAddJournalEntry(user, dossier.taskSiteIds.get(tacheId) ?? [])) {
    return { status: "error", message: "Vous n'avez pas accès à ce sujet." };
  }

  // Participants : seulement des contacts du périmètre (pas d'ID arbitraire injecté).
  const contactsVisibles = new Set(dossier.contacts.map((c) => c.id));
  const participantIds = [...new Set(formData.getAll("participantIds").map(String))].filter((id) => contactsVisibles.has(id));

  // Mise à jour du sujet (facultative) : contrôlée AVANT toute écriture, pour ne
  // jamais enregistrer un compte-rendu à moitié en cas de refus.
  const majSujet = formData.get("majSujet") === "1";
  let majTache: Parameters<typeof updateTacheFields>[1] | null = null;
  if (majSujet) {
    const tache = await getTache(tacheId);
    if (!tache) return { status: "error", message: "Sujet introuvable." };
    if (!canEditTask(user, tache)) {
      return {
        status: "error",
        message:
          "Rien n'a été enregistré : seul le responsable du sujet (ou l'administratrice) peut le mettre à jour. Décochez « Mettre à jour le sujet » pour enregistrer le compte-rendu seul.",
      };
    }
    const statut = String(formData.get("statut") ?? tache.statut);
    if (!(TACHE_STATUTS as readonly string[]).includes(statut)) return { status: "error", message: "Statut inconnu." };
    const pilotage = lirePilotage(formData);
    const manquants = champsManquants(statut, pilotage);
    if (manquants.length > 0) return { status: "error", message: messageChampsManquants(manquants) };
    majTache = { statut, ...pilotage };
  }

  await createJournalEntry({
    description,
    tacheIds: [tacheId],
    // Contact associé = l'auteur (donne le droit de modifier l'entrée) ; les présents vont dans Participants.
    contactIds: user.contactId ? [user.contactId] : [],
    origine,
    date,
    participantIds,
    lienDocument,
  });

  if (majTache) {
    try {
      await updateTacheFields(tacheId, majTache);
    } catch {
      revalidatePath("/journal");
      return {
        status: "error",
        message:
          "Compte-rendu enregistré dans le journal, mais la mise à jour du sujet a échoué. Réessayez depuis la fiche du sujet.",
        tacheId,
      };
    }
  }

  revalidatePath(`/taches/${tacheId}`);
  revalidatePath("/taches");
  revalidatePath("/journal");
  revalidatePath("/");
  return {
    status: "success",
    message: majTache ? "Enregistré : compte-rendu ajouté au journal et sujet mis à jour." : "Enregistré dans le journal.",
    tacheId,
  };
}
