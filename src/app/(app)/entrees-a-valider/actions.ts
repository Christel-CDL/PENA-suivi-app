"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { assertAdmin } from "@/lib/auth/rbac";
import { validerEntree, rejeterEntree, getEntreeAValider } from "@/lib/airtable/entrees-a-valider";
import { listContacts } from "@/lib/airtable/contacts";
import { createTache, getTache, updateTacheFields } from "@/lib/airtable/taches";
import { TACHE_STATUTS } from "@/lib/airtable/constants";
import { lirePilotage, champsManquants, messageChampsManquants } from "@/lib/pilotage";

export type FormState = { status: "idle" | "success" | "error"; message?: string };

export async function validerEntreeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  try {
    assertAdmin(user);
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }

  const entree = await getEntreeAValider(String(formData.get("id")));
  if (!entree) return { status: "error", message: "Entrée introuvable." };
  // Un double clic ou deux onglets ouverts ne doivent pas publier deux fois la même entrée.
  if (entree.statut !== "À valider") return { status: "error", message: `Cette entrée est déjà « ${entree.statut} ».` };

  const resumeCorrige = String(formData.get("resume") ?? "").trim();
  if (!resumeCorrige) return { status: "error", message: "Le résumé ne peut pas être vide." };

  const pilotage = lirePilotage(formData);
  let tacheId = String(formData.get("tacheId") ?? "");
  let majTache: Parameters<typeof updateTacheFields>[1] | null = null;

  if (formData.get("modeTache") === "nouvelle") {
    // Création d'un sujet : bouton secondaire, jamais proposé par défaut (brief v2, §1.5).
    const nom = String(formData.get("nouvelleTacheNom") ?? "").trim();
    const sousProjetId = String(formData.get("nouvelleTacheSousProjetId") ?? "");
    if (!nom) return { status: "error", message: "Le nom de la nouvelle tâche est obligatoire." };
    if (!sousProjetId) return { status: "error", message: "Choisissez le sous-projet de la nouvelle tâche." };
    const manquants = champsManquants("À faire", pilotage);
    if (manquants.length > 0) return { status: "error", message: messageChampsManquants(manquants) };
    const tache = await createTache({ nom, sousProjetIds: [sousProjetId], priorite: "Normale", pilotage });
    tacheId = tache.id;
  } else if (tacheId && formData.get("majSujet") === "1") {
    // Mise à jour du sujet existant, contrôlée avant toute écriture.
    const tache = await getTache(tacheId);
    if (!tache) return { status: "error", message: "Sujet introuvable." };
    const statut = String(formData.get("statut") ?? tache.statut);
    if (!(TACHE_STATUTS as readonly string[]).includes(statut)) return { status: "error", message: "Statut inconnu." };
    const manquants = champsManquants(statut, pilotage);
    if (manquants.length > 0) return { status: "error", message: messageChampsManquants(manquants) };
    majTache = { statut, ...pilotage };
  }

  const expediteur = entree.expediteur.trim().toLowerCase();
  const contact = expediteur ? (await listContacts()).find((c) => c.email.toLowerCase() === expediteur) : undefined;

  await validerEntree(entree, {
    resumeCorrige,
    tacheIds: tacheId ? [tacheId] : [],
    contactIds: contact ? [contact.id] : [],
  });

  if (majTache) {
    try {
      await updateTacheFields(tacheId, majTache);
    } catch {
      revalidatePath("/entrees-a-valider");
      return {
        status: "error",
        message: "Entrée publiée dans le journal, mais la mise à jour du sujet a échoué. Réessayez depuis la fiche du sujet.",
      };
    }
  }

  revalidatePath("/entrees-a-valider");
  revalidatePath("/journal");
  revalidatePath("/taches");
  revalidatePath("/");
  return {
    status: "success",
    message: majTache ? "Entrée publiée dans le journal et sujet mis à jour." : "Entrée validée et publiée dans le journal.",
  };
}

export async function rejeterEntreeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  try {
    assertAdmin(user);
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }

  await rejeterEntree(String(formData.get("id")));
  revalidatePath("/entrees-a-valider");
  return { status: "success", message: "Entrée rejetée." };
}
