"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getTache, updateTacheFields } from "@/lib/airtable/taches";
import { createJournalEntry } from "@/lib/airtable/journal";
import { createContact } from "@/lib/airtable/contacts";
import { canEditTask, canAddJournalEntry, assertAdmin } from "@/lib/auth/rbac";
import { loadDossier } from "@/lib/data/dossier";

export type FormState = { status: "idle" | "success" | "error"; message?: string };

export async function updateTacheAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée, reconnectez-vous." };

  const id = String(formData.get("id"));
  const tache = await getTache(id);
  if (!tache) return { status: "error", message: "Tâche introuvable." };

  // Vérification serveur — jamais seulement côté interface (section 5 et 10).
  if (!canEditTask(user, tache)) {
    return { status: "error", message: "Vous n'êtes pas responsable de cette tâche." };
  }

  const prestataireContactId = String(formData.get("prestataireContactId") ?? "");

  await updateTacheFields(id, {
    statut: String(formData.get("statut") ?? tache.statut),
    priorite: String(formData.get("priorite") ?? tache.priorite),
    echeance: (formData.get("echeance") as string) || null,
    description: String(formData.get("description") ?? tache.description),
    prestataireContactIds: prestataireContactId ? [prestataireContactId] : [],
  });

  revalidatePath(`/taches/${id}`);
  revalidatePath("/taches");
  revalidatePath("/");
  return { status: "success", message: "Tâche mise à jour." };
}

export async function addCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée, reconnectez-vous." };

  const id = String(formData.get("id"));
  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { status: "error", message: "Le commentaire est vide." };

  const dossier = await loadDossier(user);
  const taskSiteIds = dossier.taskSiteIds.get(id) ?? [];
  if (!canAddJournalEntry(user, taskSiteIds)) {
    return { status: "error", message: "Vous n'avez pas accès à cette tâche." };
  }

  await createJournalEntry({
    description,
    tacheIds: [id],
    contactIds: user.contactId ? [user.contactId] : [],
    origine: "Point dossier",
  });

  revalidatePath(`/taches/${id}`);
  revalidatePath("/journal");
  revalidatePath("/");
  return { status: "success", message: "Commentaire ajouté." };
}

/**
 * Crée un nouveau contact et l'assigne immédiatement comme prestataire de la
 * tâche — réservé à l'Admin, comme toute création de contact (section 5).
 */
export async function createPrestataireAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  try {
    assertAdmin(user);
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }

  const id = String(formData.get("id"));
  const nom = String(formData.get("nom") ?? "").trim();
  const organisation = String(formData.get("organisation") ?? "").trim();
  if (!nom) return { status: "error", message: "Le nom du prestataire est obligatoire." };

  const contact = await createContact({ nom, organisation });
  await updateTacheFields(id, { prestataireContactIds: [contact.id] });

  revalidatePath(`/taches/${id}`);
  revalidatePath("/taches");
  revalidatePath("/contacts");
  return { status: "success", message: `Contact « ${nom} » créé et assigné comme prestataire.` };
}

/**
 * Assigne (ou change) le responsable d'une tâche — réservé à l'Admin. Un
 * Contributeur ne peut pas s'auto-assigner une tâche non suivie : ça
 * reviendrait à modifier une tâche dont il n'est pas encore responsable,
 * ce que la section 5 du cahier des charges interdit.
 */
export async function updateResponsableAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  try {
    assertAdmin(user);
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }

  const id = String(formData.get("id"));
  const responsableContactId = String(formData.get("responsableContactId") ?? "");

  await updateTacheFields(id, {
    responsableContactIds: responsableContactId ? [responsableContactId] : [],
  });

  revalidatePath(`/taches/${id}`);
  revalidatePath("/taches");
  revalidatePath("/");
  return { status: "success", message: "Responsable mis à jour." };
}

/**
 * Ajoute ou retire une partie prenante — mêmes droits que le reste de la
 * fiche (Admin, ou le responsable actuel de la tâche).
 */
export async function updatePartiesPrenantesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée, reconnectez-vous." };

  const id = String(formData.get("id"));
  const tache = await getTache(id);
  if (!tache) return { status: "error", message: "Tâche introuvable." };

  if (!canEditTask(user, tache)) {
    return { status: "error", message: "Vous n'êtes pas responsable de cette tâche." };
  }

  const partiesPrenantesIds = formData.getAll("partiesPrenantesIds").map(String);
  await updateTacheFields(id, { partiesPrenantesIds });

  revalidatePath(`/taches/${id}`);
  return { status: "success", message: "Parties prenantes mises à jour." };
}
