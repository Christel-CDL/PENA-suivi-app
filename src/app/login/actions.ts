"use server";

import { findUtilisateurByEmail } from "@/lib/airtable/users";
import { createMagicLinkToken } from "@/lib/auth/magic-link";
import { sendMagicLinkEmail } from "@/lib/auth/mailer";

export type RequestLinkState = { status: "idle" | "sent" | "error"; message?: string };

/**
 * Envoie le lien magique si l'e-mail correspond à un utilisateur Actif dans
 * UTILISATEURS. Renvoie toujours le même message de succès, que l'adresse soit
 * connue ou non, pour ne pas révéler qui a accès à l'application.
 */
export async function requestMagicLink(
  _prev: RequestLinkState,
  formData: FormData,
): Promise<RequestLinkState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !email.includes("@")) {
    return { status: "error", message: "Merci de saisir une adresse e-mail valide." };
  }

  try {
    const user = await findUtilisateurByEmail(email);
    if (user) {
      const token = await createMagicLinkToken(user.email);
      const baseUrl = process.env.APP_URL || "http://localhost:3000";
      const loginUrl = `${baseUrl}/api/auth/callback?token=${encodeURIComponent(token)}`;
      await sendMagicLinkEmail(user.email, loginUrl);
    }
  } catch (err) {
    console.error("Échec d'envoi du lien magique :", err);
    return { status: "error", message: "Une erreur est survenue. Réessayez dans un instant." };
  }

  return {
    status: "sent",
    message: "Si cette adresse est autorisée, un lien de connexion vient de vous être envoyé (valable 15 minutes).",
  };
}
