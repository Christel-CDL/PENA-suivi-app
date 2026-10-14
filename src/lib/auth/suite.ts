/**
 * Page où revenir après la connexion par lien magique. Seule la page de
 * consentement du connecteur Claude est acceptée (chemin interne, jamais une
 * adresse externe) : un lien piégé ne peut pas rediriger ailleurs après connexion.
 */
export function suiteValide(suite: string | null | undefined): string | null {
  if (!suite || suite.length > 4000) return null;
  return suite.startsWith("/oauth/authorize?") && !suite.includes("\\") ? suite : null;
}
