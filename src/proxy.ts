import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { suiteValide } from "@/lib/auth/suite";

const SESSION_COOKIE = "pena_session";

// Garde légère (Edge runtime) : vérifie juste qu'un cookie de session valide
// existe, pour rediriger vers /login sinon. Les vérifications de rôle/site/
// statut "Actif", elles, sont refaites à chaque page/action côté serveur
// (getCurrentUser dans lib/auth/session.ts) car elles nécessitent une lecture
// Airtable à jour — pas quelque chose qu'on peut faire ici sans alourdir
// chaque requête.
async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    // Connecteur Claude : ces points ont leur propre protection (jeton OAuth,
    // PKCE, adresses de retour limitées à Claude) et ne passent pas par un cookie.
    pathname.startsWith("/api/mcp") ||
    pathname.startsWith("/api/oauth/") ||
    pathname.startsWith("/.well-known/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  const authenticated = await hasValidSession(request);

  // APP_URL plutôt que request.url : derrière Traefik, ce dernier se résout
  // à l'adresse interne du conteneur (0.0.0.0:3000) plutôt qu'au nom de
  // domaine public.
  const baseUrl = process.env.APP_URL || "http://localhost:3000";

  // Page d'autorisation du connecteur Claude : après connexion, on doit y revenir avec tous ses paramètres.
  const suite = suiteValide(`${pathname}${request.nextUrl.search}`);

  if (!authenticated && !isPublic) {
    const loginUrl = new URL("/login", baseUrl);
    if (suite) loginUrl.searchParams.set("suite", suite);
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL(suiteValide(request.nextUrl.searchParams.get("suite")) ?? "/", baseUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
