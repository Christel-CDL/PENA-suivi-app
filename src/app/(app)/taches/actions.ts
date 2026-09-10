"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { assertAdmin } from "@/lib/auth/rbac";
import { createTache } from "@/lib/airtable/taches";

export type FormState = { status: "idle" | "error"; message?: string };

/** Création directe — réservée à l'Admin (section 5) ; un Contributeur passe par Demandes. */
export async function createTacheAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  try {
    assertAdmin(user);
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }

  const nom = String(formData.get("nom") ?? "").trim();
  const sousProjetId = String(formData.get("sousProjetId") ?? "");
  if (!nom) return { status: "error", message: "Le nom de la tâche est obligatoire." };
  if (!sousProjetId) return { status: "error", message: "Le sous-projet est obligatoire." };

  const responsableContactId = String(formData.get("responsableContactId") ?? "");

  const tache = await createTache({
    nom,
    sousProjetIds: [sousProjetId],
    responsableContactIds: responsableContactId ? [responsableContactId] : [],
    description: String(formData.get("description") ?? "").trim(),
    priorite: String(formData.get("priorite") ?? "").trim(),
    echeance: (formData.get("echeance") as string) || null,
  });

  revalidatePath("/taches");
  revalidatePath("/");
  redirect(`/taches/${tache.id}`);
}
