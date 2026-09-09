"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { assertAdmin } from "@/lib/auth/rbac";
import { validerEntree, rejeterEntree } from "@/lib/airtable/entrees-a-valider";
import { listContacts } from "@/lib/airtable/contacts";

export type FormState = { status: "idle" | "success" | "error"; message?: string };

export async function validerEntreeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  try {
    assertAdmin(user);
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }

  const id = String(formData.get("id"));
  const resumeCorrige = String(formData.get("resume") ?? "").trim();
  if (!resumeCorrige) return { status: "error", message: "Le résumé ne peut pas être vide." };

  const tacheId = String(formData.get("tacheId") ?? "");
  const expediteur = String(formData.get("expediteur") ?? "").trim().toLowerCase();

  const contacts = await listContacts();
  const contact = contacts.find((c) => c.email.toLowerCase() === expediteur);

  await validerEntree(id, {
    resumeCorrige,
    tacheIds: tacheId ? [tacheId] : [],
    contactIds: contact ? [contact.id] : [],
  });

  revalidatePath("/entrees-a-valider");
  revalidatePath("/journal");
  revalidatePath("/");
  return { status: "success", message: "Entrée validée et publiée dans le journal." };
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
