"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { canUseConnector } from "@/lib/auth/rbac";
import { creerCode, lireClient, redirectionAutorisee } from "@/lib/auth/oauth";

/**
 * Réponse de l'utilisateur à la page de consentement. Tout est revérifié ici
 * (session, droit au connecteur, client, adresse de retour), quel que soit ce
 * qu'affichait la page.
 */
export async function repondreAutorisation(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");
  const codeChallenge = String(formData.get("code_challenge") ?? "");

  const client = await lireClient(clientId);
  if (!client || !client.redirectUris.includes(redirectUri) || !redirectionAutorisee(redirectUri)) {
    throw new Error("Demande d'autorisation invalide.");
  }

  const retour = new URL(redirectUri);
  if (state) retour.searchParams.set("state", state);

  const user = await getCurrentUser();
  if (formData.get("decision") !== "autoriser" || !user || !canUseConnector(user) || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) {
    retour.searchParams.set("error", "access_denied");
    redirect(retour.toString());
  }

  retour.searchParams.set("code", await creerCode({ email: user.email, clientId, redirectUri, codeChallenge }));
  redirect(retour.toString());
}
