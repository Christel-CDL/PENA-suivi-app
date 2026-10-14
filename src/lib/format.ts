export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isOverdue(dateIso: string | null | undefined): boolean {
  if (!dateIso) return false;
  return new Date(dateIso).getTime() < Date.now();
}

/** Maintenant, heure de Paris, au format d'un <input type="datetime-local"> (AAAA-MM-JJTHH:MM). */
export function maintenantParisLocal(): string {
  return new Date().toLocaleString("sv-SE", { timeZone: "Europe/Paris" }).slice(0, 16).replace(" ", "T");
}

/**
 * Convertit une date-heure saisie à l'heure de Paris (datetime-local, sans
 * fuseau) en ISO UTC pour Airtable. Gère l'heure d'été : le décalage est
 * calculé pour la date saisie elle-même. Renvoie null si la saisie est invalide.
 */
export function parisLocalVersIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const commeUtc = new Date(`${local}:00Z`);
  if (Number.isNaN(commeUtc.getTime())) return null;
  const vuAParis = new Date(commeUtc.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const vuEnUtc = new Date(commeUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(commeUtc.getTime() - (vuAParis.getTime() - vuEnUtc.getTime())).toISOString();
}

/**
 * Lien de document saisi : seulement http(s), jamais javascript: ou data:
 * (il est ensuite affiché comme un lien cliquable). Renvoie null si refusé.
 */
export function lienDocumentValide(valeur: string): string | null {
  try {
    const url = new URL(valeur.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
