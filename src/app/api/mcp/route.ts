import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { utilisateurDuJeton, urlApp } from "@/lib/auth/oauth";
import { creerServeurMcp } from "@/lib/mcp/outils";

/**
 * Point MCP du connecteur Claude « Suivi PENA » (Streamable HTTP, sans session).
 * Chaque requête : jeton OAuth vérifié → utilisateur relu dans Airtable (Actif,
 * rôle, sites) → serveur MCP construit pour CET utilisateur.
 */
async function traiter(request: Request) {
  const user = await utilisateurDuJeton(request.headers.get("authorization"));
  if (!user) {
    // 401 + métadonnées : c'est ce qui déclenche, côté Claude, la connexion OAuth.
    return new Response(JSON.stringify({ error: "invalid_token" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer resource_metadata="${urlApp()}/.well-known/oauth-protected-resource"`,
      },
    });
  }
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await creerServeurMcp(user).connect(transport);
  return transport.handleRequest(request);
}

export const POST = traiter;
export const GET = traiter;
export const DELETE = traiter;
