"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { assertAdmin, canAccessSites } from "@/lib/auth/rbac";
import { creerDemande, accepterDemande, refuserDemande, listDemandes } from "@/lib/airtable/demandes";
import { listUtilisateurs } from "@/lib/airtable/users";

export type FormState = { status: "idle" | "success" | "error"; message?: string };

export async function submitDemandeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée, reconnectez-vous." };

  const siteIds = formData.getAll("siteIds").map(String);
  if (!canAccessSites(user, siteIds)) {
    return { status: "error", message: "Vous n'avez pas accès à ce site." };
  }

  // La demande est rattachée au contact lié de l'utilisateur, via son enregistrement
  // UTILISATEURS (et non un simple champ texte ressaisi).
  const utilisateurs = await listUtilisateurs();
  const utilisateur = utilisateurs.find((u) => u.email === user.email);
  if (!utilisateur) return { status: "error", message: "Utilisateur introuvable." };

  const titre = String(formData.get("titre") ?? "").trim();
  if (!titre) return { status: "error", message: "Le titre est obligatoire." };

  await creerDemande({
    titre,
    type: String(formData.get("type") ?? ""),
    demandeurId: utilisateur.id,
    siteIds,
    sousProjetParentIds: formData.getAll("sousProjetParentIds").map(String),
    description: String(formData.get("description") ?? "").trim(),
  });

  revalidatePath("/demandes");
  return { status: "success", message: "Demande envoyée à l'administratrice." };
}

export async function accepterDemandeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  try {
    assertAdmin(user);
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }

  const id = String(formData.get("id"));
  const demande = (await listDemandes()).find((d) => d.id === id);
  if (!demande) return { status: "error", message: "Demande introuvable." };

  await accepterDemande(demande);
  revalidatePath("/demandes");
  revalidatePath("/taches");
  revalidatePath("/");
  return { status: "success", message: "Demande acceptée et élément créé." };
}

export async function refuserDemandeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  try {
    assertAdmin(user);
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }

  await refuserDemande(String(formData.get("id")));
  revalidatePath("/demandes");
  return { status: "success", message: "Demande refusée." };
}
