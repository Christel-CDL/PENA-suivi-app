import { NextResponse } from "next/server";
import { urlApp } from "@/lib/auth/oauth";

// Métadonnées du serveur d'autorisation (RFC 8414), lues par Claude à l'ajout du connecteur.
export function GET() {
  const base = urlApp();
  return NextResponse.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
}
