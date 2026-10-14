import "server-only";
import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { findUtilisateurByEmail, type Utilisateur } from "@/lib/airtable/users";
import { canUseConnector } from "./rbac";

/**
 * Serveur d'autorisation OAuth 2.1 minimal pour le connecteur MCP « Suivi PENA »
 * (Claude). Sans état : client, code et jetons sont des JWT signés.
 *
 * Clé distincte de celle des sessions (dérivée d'AUTH_SECRET) : un jeton OAuth ne
 * peut jamais servir de cookie de session, ni l'inverse. Les jetons portent `sub`
 * (jamais `email`, que lit la session) et un `typ` vérifié à chaque usage.
 *
 * Les droits ne sont jamais figés dans un jeton : à chaque requête MCP, l'utilisateur
 * est relu dans Airtable (Actif, rôle, sites), comme pour l'application.
 */

const DUREE_CODE = "5m";
const DUREE_ACCES_S = 3600;
const DUREE_RENOUVELLEMENT = "30d";

let cle: Uint8Array | null = null;
function cleOAuth(): Uint8Array {
  if (cle) return cle;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET manquant ou trop court.");
  cle = new Uint8Array(createHash("sha256").update(`${secret}:oauth-mcp`).digest());
  return cle;
}

export function urlApp(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
export function urlRessourceMcp(): string {
  return `${urlApp()}/api/mcp`;
}

/**
 * Adresses de retour acceptées : celles de Claude (web, bureau) et le bouclage local
 * (Claude Code, tests). Un site tiers ne peut donc pas récupérer un code d'autorisation.
 */
export function redirectionAutorisee(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.protocol === "https:" && ["claude.ai", "claude.com"].includes(u.hostname) && u.pathname === "/api/mcp/auth_callback") {
      return true;
    }
    return u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1") && !u.username && !u.password;
  } catch {
    return false;
  }
}

async function signer(charge: Record<string, unknown>, duree: string | number) {
  return new SignJWT(charge).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(duree).sign(cleOAuth());
}
async function verifier(jeton: string, typ: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(jeton, cleOAuth());
    return payload.typ === typ ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// --- Enregistrement dynamique du client (RFC 7591) ------------------------------
export type ClientOAuth = { redirectUris: string[]; nom: string };

export async function creerClient(client: ClientOAuth): Promise<string> {
  return new SignJWT({ typ: "client", ru: client.redirectUris, nom: client.nom })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(cleOAuth());
}
export async function lireClient(clientId: string): Promise<ClientOAuth | null> {
  const p = await verifier(clientId, "client");
  if (!p || !Array.isArray(p.ru)) return null;
  return { redirectUris: p.ru as string[], nom: String(p.nom ?? "Claude") };
}

// --- Code d'autorisation (5 min, usage unique, PKCE S256 obligatoire) -----------
export async function creerCode(input: { email: string; clientId: string; redirectUri: string; codeChallenge: string }) {
  return signer(
    { typ: "code", sub: input.email, cid: input.clientId, ru: input.redirectUri, cc: input.codeChallenge, jti: crypto.randomUUID() },
    DUREE_CODE,
  );
}

// Codes déjà échangés (un seul conteneur : la mémoire du processus suffit, et un code expire en 5 min).
const codesUtilises = new Map<string, number>();
function marquerCodeUtilise(jti: string): boolean {
  const maintenant = Date.now();
  for (const [id, expire] of codesUtilises) if (expire < maintenant) codesUtilises.delete(id);
  if (codesUtilises.has(jti)) return false;
  codesUtilises.set(jti, maintenant + 10 * 60 * 1000);
  return true;
}

function pkceS256(verificateur: string): string {
  return createHash("sha256").update(verificateur).digest("base64url");
}

export type ErreurOAuth = { erreur: "invalid_grant" | "invalid_client" | "invalid_request" | "access_denied"; description: string };
export type JetonsOAuth = { access_token: string; refresh_token: string; token_type: "Bearer"; expires_in: number };

/** L'utilisateur existe-t-il toujours, est-il Actif et autorisé à utiliser le connecteur ? */
export async function utilisateurConnecteur(email: string): Promise<Utilisateur | null> {
  const user = await findUtilisateurByEmail(email);
  return user && user.actif && canUseConnector(user) ? user : null;
}

async function emettreJetons(email: string, clientId: string): Promise<JetonsOAuth> {
  return {
    access_token: await signer({ typ: "acces", sub: email, aud: urlRessourceMcp() }, `${DUREE_ACCES_S}s`),
    refresh_token: await signer({ typ: "renouvellement", sub: email, cid: clientId }, DUREE_RENOUVELLEMENT),
    token_type: "Bearer",
    expires_in: DUREE_ACCES_S,
  };
}

export async function echangerCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<JetonsOAuth | ErreurOAuth> {
  const p = await verifier(input.code, "code");
  if (!p) return { erreur: "invalid_grant", description: "Code invalide ou expiré." };
  if (p.cid !== input.clientId || p.ru !== input.redirectUri) {
    return { erreur: "invalid_grant", description: "Code émis pour un autre client ou une autre adresse de retour." };
  }
  if (!input.codeVerifier || pkceS256(input.codeVerifier) !== p.cc) {
    return { erreur: "invalid_grant", description: "Vérification PKCE échouée." };
  }
  if (!marquerCodeUtilise(String(p.jti))) return { erreur: "invalid_grant", description: "Code déjà utilisé." };
  const user = await utilisateurConnecteur(String(p.sub));
  if (!user) return { erreur: "access_denied", description: "Accès au connecteur non autorisé pour ce compte." };
  return emettreJetons(user.email, input.clientId);
}

export async function renouveler(input: { refreshToken: string; clientId: string }): Promise<JetonsOAuth | ErreurOAuth> {
  const p = await verifier(input.refreshToken, "renouvellement");
  if (!p || (input.clientId && p.cid !== input.clientId)) return { erreur: "invalid_grant", description: "Jeton de renouvellement invalide." };
  const user = await utilisateurConnecteur(String(p.sub));
  if (!user) return { erreur: "access_denied", description: "Accès au connecteur non autorisé pour ce compte." };
  return emettreJetons(user.email, String(p.cid));
}

/** Jeton d'accès présenté au point MCP → utilisateur à jour, ou null (401). */
export async function utilisateurDuJeton(entete: string | null): Promise<Utilisateur | null> {
  const jeton = entete?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!jeton) return null;
  try {
    const { payload } = await jwtVerify(jeton, cleOAuth(), { audience: urlRessourceMcp() });
    if (payload.typ !== "acces" || typeof payload.sub !== "string") return null;
    return utilisateurConnecteur(payload.sub);
  } catch {
    return null;
  }
}
