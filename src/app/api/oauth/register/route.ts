import { NextRequest, NextResponse } from "next/server";
import { creerClient, redirectionAutorisee } from "@/lib/auth/oauth";

/**
 * Enregistrement dynamique de client (RFC 7591), utilisé par Claude à l'ajout du
 * connecteur. Seules les adresses de retour de Claude (et le bouclage local) sont
 * acceptées ; l'identifiant renvoyé est un jeton signé qui les contient.
 */
export async function POST(request: NextRequest) {
  const corps = await request.json().catch(() => null);
  const redirectUris: unknown = corps?.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0 || redirectUris.length > 5) {
    return NextResponse.json({ error: "invalid_redirect_uri", error_description: "redirect_uris manquant." }, { status: 400 });
  }
  if (!redirectUris.every((u) => typeof u === "string" && redirectionAutorisee(u))) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "Adresse de retour non autorisée pour ce connecteur." },
      { status: 400 },
    );
  }
  const nom = String(corps?.client_name ?? "Claude").slice(0, 80);
  const clientId = await creerClient({ redirectUris: redirectUris as string[], nom });
  return NextResponse.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: nom,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201 },
  );
}
