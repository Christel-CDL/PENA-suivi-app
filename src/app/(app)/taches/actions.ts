"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { assertAdmin, canEditTask } from "@/lib/auth/rbac";
import { createTache, listTaches, updateTachesStatut, deplacerTaches } from "@/lib/airtable/taches";
import { listSousProjets, createSousProjet } from "@/lib/airtable/sous-projets";
import { listSites } from "@/lib/airtable/sites";
import { TACHE_STATUTS } from "@/lib/airtable/constants";

export type FormState = { status: "idle" | "error"; message?: string };
export type BulkResult = { status: "success" | "error"; message: string };

const MAX_LOT = 200;

function revaloriserListes() {
  revalidatePath("/taches");
  revalidatePath("/planning");
  revalidatePath("/");
}

/**
 * Changement de statut en lot depuis la liste. Mêmes droits qu'à l'unité : un
 * Contributeur ne modifie que les tâches dont il est responsable ; les autres
 * sont ignorées (et comptées dans le message), jamais modifiées.
 */
export async function bulkStatutAction(ids: string[], statut: string): Promise<BulkResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée, reconnectez-vous." };
  if (!(TACHE_STATUTS as readonly string[]).includes(statut)) {
    return { status: "error", message: "Statut inconnu." };
  }
  const demandes = [...new Set(ids)];
  if (demandes.length === 0 || demandes.length > MAX_LOT) {
    return { status: "error", message: `Sélectionnez entre 1 et ${MAX_LOT} tâches.` };
  }

  const parId = new Map((await listTaches()).map((t) => [t.id, t]));
  const autorisees = demandes.filter((id) => {
    const t = parId.get(id);
    return t !== undefined && canEditTask(user, t);
  });
  if (autorisees.length === 0) {
    return { status: "error", message: "Vous n'êtes responsable d'aucune des tâches sélectionnées." };
  }

  await updateTachesStatut(autorisees, statut);
  revaloriserListes();

  const ignorees = demandes.length - autorisees.length;
  return {
    status: "success",
    message:
      `${autorisees.length} tâche(s) passée(s) à « ${statut} ».` +
      (ignorees > 0 ? ` ${ignorees} ignorée(s) : vous n'en êtes pas responsable.` : ""),
  };
}

/** Regroupement : déplace les tâches vers un autre sous-projet. Réservé à l'Admin. */
export async function bulkDeplacerAction(ids: string[], sousProjetId: string): Promise<BulkResult> {
  const user = await getCurrentUser();
  try {
    assertAdmin(user);
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
  const demandes = [...new Set(ids)];
  if (demandes.length === 0 || demandes.length > MAX_LOT) {
    return { status: "error", message: `Sélectionnez entre 1 et ${MAX_LOT} tâches.` };
  }

  const sousProjet = (await listSousProjets()).find((sp) => sp.id === sousProjetId);
  if (!sousProjet) return { status: "error", message: "Sous-projet introuvable." };

  const existantes = new Set((await listTaches()).map((t) => t.id));
  const valides = demandes.filter((id) => existantes.has(id));
  if (valides.length === 0) return { status: "error", message: "Tâches introuvables." };

  await deplacerTaches(valides, sousProjetId);
  revaloriserListes();
  return { status: "success", message: `${valides.length} tâche(s) déplacée(s) vers « ${sousProjet.nom} ».` };
}

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

/**
 * Regroupement : crée un nouveau sous-projet sur un site puis y range les tâches
 * sélectionnées (même une seule). Réservé à l'Admin.
 */
export async function bulkRegrouperAction(ids: string[], nom: string, siteId: string): Promise<BulkResult> {
  const user = await getCurrentUser();
  try {
    assertAdmin(user);
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
  const titre = nom.trim();
  if (!titre) return { status: "error", message: "Le nom du sous-projet est obligatoire." };
  if (titre.length > 120) return { status: "error", message: "Nom trop long (120 caractères maximum)." };
  const demandes = [...new Set(ids)];
  if (demandes.length === 0 || demandes.length > MAX_LOT) {
    return { status: "error", message: `Sélectionnez entre 1 et ${MAX_LOT} tâches.` };
  }

  const site =(await listSites()).find((s) => s.id === siteId);
  if (!site) return { status: "error", message: "Site introuvable." };

  const doublon = (await listSousProjets()).some(
    (sp) => sp.projetIds.includes(siteId) && sp.nom.trim().toLowerCase() === titre.toLowerCase(),
  );
  if (doublon) {
    return {
      status: "error",
      message: `Un sous-projet « ${titre} » existe déjà sur ${site.nom} : utilisez « Déplacer vers ce sous-projet ».`,
    };
  }

  const existantes = new Set((await listTaches()).map((t) => t.id));
  const valides = demandes.filter((id) => existantes.has(id));
  if (valides.length === 0) return { status: "error", message: "Tâches introuvables." };

  const sousProjet = await createSousProjet({ nom: titre, projetIds: [siteId] });
  await deplacerTaches(valides, sousProjet.id);
  revaloriserListes();
  return {
    status: "success",
    message: `Sous-projet « ${titre} » créé sur ${site.nom} avec ${valides.length} tâche(s).`,
  };
}
