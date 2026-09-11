import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLinkToken } from "@/lib/auth/magic-link";
import { createSessionCookie } from "@/lib/auth/session";
import { findUtilisateurByEmail } from "@/lib/airtable/users";

export async function GET(request: NextRequest) {
  // Construit les URL de redirection à partir d'APP_URL plutôt que de
  // request.url : derrière Traefik, ce dernier se résout à l'adresse
  // interne du conteneur (0.0.0.0:3000) plutôt qu'au nom de domaine public.
  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  const token = request.nextUrl.searchParams.get("token");
  const loginUrl = new URL("/login", baseUrl);

  if (!token) {
    loginUrl.searchParams.set("error", "lien_invalide");
    return NextResponse.redirect(loginUrl);
  }

  const email = await verifyMagicLinkToken(token);
  if (!email) {
    loginUrl.searchParams.set("error", "lien_expire");
    return NextResponse.redirect(loginUrl);
  }

  // Re-vérifie que le compte existe toujours et est Actif au moment du clic
  // (et pas seulement au moment de l'envoi de l'e-mail).
  const user = await findUtilisateurByEmail(email);
  if (!user || !user.actif) {
    loginUrl.searchParams.set("error", "acces_refuse");
    return NextResponse.redirect(loginUrl);
  }

  await createSessionCookie(user.email);
  return NextResponse.redirect(new URL("/", baseUrl));
}
