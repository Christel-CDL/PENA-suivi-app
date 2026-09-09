import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { getAuthSecretKey } from "./secret";

const MAGIC_LINK_TTL = "15m";

/** Jeton signé, à courte durée de vie, envoyé par e-mail pour la connexion sans mot de passe. */
export async function createMagicLinkToken(email: string): Promise<string> {
  return new SignJWT({ email, purpose: "login" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(MAGIC_LINK_TTL)
    .sign(getAuthSecretKey());
}

/** Vérifie le jeton du lien magique et renvoie l'e-mail associé, ou null si invalide/expiré. */
export async function verifyMagicLinkToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    if (payload.purpose !== "login" || typeof payload.email !== "string") return null;
    return payload.email;
  } catch {
    return null;
  }
}
