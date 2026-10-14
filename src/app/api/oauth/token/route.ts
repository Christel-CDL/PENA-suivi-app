import { NextRequest, NextResponse } from "next/server";
import { echangerCode, renouveler, lireClient } from "@/lib/auth/oauth";

/** Point d'échange des jetons (code d'autorisation + PKCE, ou renouvellement). */
export async function POST(request: NextRequest) {
  const type = request.headers.get("content-type") ?? "";
  const champs = type.includes("application/json")
    ? new URLSearchParams(Object.entries((await request.json().catch(() => ({}))) as Record<string, string>))
    : new URLSearchParams(await request.text());

  const clientId = champs.get("client_id") ?? "";
  const grantType = champs.get("grant_type");

  let resultat;
  if (grantType === "authorization_code") {
    if (!(await lireClient(clientId))) return erreur("invalid_client", "Client inconnu.", 401);
    resultat = await echangerCode({
      code: champs.get("code") ?? "",
      clientId,
      redirectUri: champs.get("redirect_uri") ?? "",
      codeVerifier: champs.get("code_verifier") ?? "",
    });
  } else if (grantType === "refresh_token") {
    resultat = await renouveler({ refreshToken: champs.get("refresh_token") ?? "", clientId });
  } else {
    return erreur("unsupported_grant_type", "Type d'autorisation non pris en charge.", 400);
  }

  if ("erreur" in resultat) return erreur(resultat.erreur, resultat.description, 400);
  return NextResponse.json(resultat, { headers: { "Cache-Control": "no-store" } });
}

function erreur(code: string, description: string, status: number) {
  return NextResponse.json({ error: code, error_description: description }, { status, headers: { "Cache-Control": "no-store" } });
}
