"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { assertAdmin } from "@/lib/auth/rbac";
import { createContact, updateContact, type ContactInput } from "@/lib/airtable/contacts";

export type FormState = { status: "idle" | "success" | "error"; message?: string };

function readInput(formData: FormData): ContactInput {
  return {
    nom: String(formData.get("nom") ?? "").trim(),
    organisation: String(formData.get("organisation") ?? "").trim(),
    fonction: String(formData.get("fonction") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    telephone: String(formData.get("telephone") ?? "").trim(),
    projetIds: formData.getAll("projetIds").map(String),
  };
}

export async function createContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  try {
    assertAdmin(user);
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }

  const input = readInput(formData);
  if (!input.nom) return { status: "error", message: "Le nom est obligatoire." };

  await createContact(input);
  revalidatePath("/contacts");
  return { status: "success", message: "Contact ajouté." };
}

export async function updateContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  try {
    assertAdmin(user);
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }

  const id = String(formData.get("id"));
  const input = readInput(formData);
  if (!input.nom) return { status: "error", message: "Le nom est obligatoire." };

  await updateContact(id, input);
  revalidatePath("/contacts");
  return { status: "success", message: "Contact mis à jour." };
}
