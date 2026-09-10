"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { loadDossier } from "@/lib/data/dossier";
import {
  createJournalEntry,
  detectRelatedTaskId,
  listJournalEntries,
  updateJournalEntry,
  deleteJournalEntry,
} from "@/lib/airtable/journal";
import { canEditJournalEntry } from "@/lib/auth/rbac";

export type FormState = { status: "idle" | "success" | "error"; message?: string };

export async function addJournalEntryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée, reconnectez-vous." };

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { status: "error", message: "La description est vide." };

  // Le dossier est déjà restreint aux sites autorisés de l'utilisateur : la
  // détection ne peut donc rattacher l'entrée qu'à une tâche dans son périmètre.
  const dossier = await loadDossier(user);
  const relatedTaskId = detectRelatedTaskId(description, dossier.taches);

  await createJournalEntry({
    description,
    tacheIds: relatedTaskId ? [relatedTaskId] : [],
    contactIds: user.contactId ? [user.contactId] : [],
    origine: "Point dossier",
  });

  revalidatePath("/journal");
  revalidatePath("/");
  if (relatedTaskId) revalidatePath(`/taches/${relatedTaskId}`);

  const tache = relatedTaskId ? dossier.taches.find((t) => t.id === relatedTaskId) : null;
  return {
    status: "success",
    message: tache ? `Entrée ajoutée, rattachée automatiquement à « ${tache.nom} ».` : "Entrée ajoutée au journal.",
  };
}

async function findEntryOrThrow(id: string) {
  const entry = (await listJournalEntries()).find((e) => e.id === id);
  if (!entry) throw new Error("Entrée introuvable.");
  return entry;
}

export async function updateJournalEntryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée, reconnectez-vous." };

  const id = String(formData.get("id"));
  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { status: "error", message: "La description ne peut pas être vide." };

  try {
    const entry = await findEntryOrThrow(id);
    if (!canEditJournalEntry(user, entry)) {
      return { status: "error", message: "Vous ne pouvez modifier que vos propres entrées." };
    }
    await updateJournalEntry(id, description);
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }

  revalidatePath("/journal");
  revalidatePath("/");
  return { status: "success", message: "Entrée modifiée." };
}

export async function deleteJournalEntryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée, reconnectez-vous." };

  const id = String(formData.get("id"));

  try {
    const entry = await findEntryOrThrow(id);
    if (!canEditJournalEntry(user, entry)) {
      return { status: "error", message: "Vous ne pouvez supprimer que vos propres entrées." };
    }
    await deleteJournalEntry(id);
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }

  revalidatePath("/journal");
  revalidatePath("/");
  return { status: "success", message: "Entrée supprimée." };
}
