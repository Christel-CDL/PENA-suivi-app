import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getAuthSecretKey } from "./secret";
import { findUtilisateurByEmail, type Utilisateur } from "@/lib/airtable/users";

const SESSION_COOKIE = "pena_session";
const SESSION_TTL = "30d";

/**
 * Le cookie de session ne contient QUE l'e-mail authentifié — jamais le rôle, le
 * périmètre de site ou le statut. Ces droits sont relus dans Airtable à chaque
 * requête serveur (via getCurrentUser), pour respecter l'exigence non négociable
 * du cahier des charges : le contrôle d'accès ne doit jamais reposer sur une
 * donnée mise en cache côté client (une suspension dans Airtable doit couper
 * l'accès en quelques secondes, pas au bout de 30 jours).
 */
export async function createSessionCookie(email: string) {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getAuthSecretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

async function getSessionEmail(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

/**
 * Utilisateur actuellement connecté, avec ses droits à jour (relus dans Airtable,
 * voir cache 20s dans lib/airtable/client). Renvoie null si pas de session, si
 * l'e-mail ne correspond plus à personne dans UTILISATEURS, ou si le compte est
 * Suspendu.
 */
export async function getCurrentUser(): Promise<Utilisateur | null> {
  const email = await getSessionEmail();
  if (!email) return null;
  const user = await findUtilisateurByEmail(email);
  if (!user || !user.actif) return null;
  return user;
}
