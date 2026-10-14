import { NextResponse } from "next/server";
import { urlApp, urlRessourceMcp } from "@/lib/auth/oauth";

// Métadonnées de la ressource protégée (RFC 9728) : indiquent à Claude où s'authentifier.
// Le segment facultatif couvre aussi /.well-known/oauth-protected-resource/api/mcp.
export function GET() {
  return NextResponse.json({
    resource: urlRessourceMcp(),
    authorization_servers: [urlApp()],
    bearer_methods_supported: ["header"],
    resource_name: "Suivi ICPE PENA",
  });
}
