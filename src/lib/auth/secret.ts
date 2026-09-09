import "server-only";

let cached: Uint8Array | null = null;

/** Clé de signature JWT (jetons de lien magique + cookie de session). */
export function getAuthSecretKey(): Uint8Array {
  if (cached) return cached;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET manquant ou trop court (32 caractères minimum). Générez-en un avec : openssl rand -base64 32",
    );
  }
  cached = new TextEncoder().encode(secret);
  return cached;
}
