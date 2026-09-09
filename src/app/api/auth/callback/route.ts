import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLinkToken } from "@/lib/auth/magic-link";
import { createSessionCookie } from "@/lib/auth/session";
import { findUtilisateurByEmail } from "@/lib/airtable/users";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const loginUrl = new URL("/login", request.url);

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
  return NextResponse.redirect(new URL("/", request.url));
}
