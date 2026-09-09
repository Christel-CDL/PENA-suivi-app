import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

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
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  const authenticated = await hasValidSession(request);

  if (!authenticated && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
