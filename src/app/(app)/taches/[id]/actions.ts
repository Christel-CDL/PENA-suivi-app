"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getTache, updateTacheFields } from "@/lib/airtable/taches";
import { createJournalEntry } from "@/lib/airtable/journal";
import { canEditTask, canAddJournalEntry } from "@/lib/auth/rbac";
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

  await updateTacheFields(id, {
    statut: String(formData.get("statut") ?? tache.statut),
    priorite: String(formData.get("priorite") ?? tache.priorite),
    echeance: (formData.get("echeance") as string) || null,
    description: String(formData.get("description") ?? tache.description),
    prestataire: String(formData.get("prestataire") ?? tache.prestataire),
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
