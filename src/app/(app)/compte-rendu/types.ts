// Types proposés pour un compte-rendu saisi à la main (valeurs exactes du champ
// Origine du journal). « Email » est réservé aux entrées validées depuis n8n.
export const TYPES_COMPTE_RENDU = ["Visite terrain", "Réunion / Entretien", "Point dossier", "Autre"] as const;

export const LIBELLES_TYPE: Record<(typeof TYPES_COMPTE_RENDU)[number], string> = {
  "Visite terrain": "Visite terrain",
  "Réunion / Entretien": "Réunion / Entretien",
  "Point dossier": "Point dossier (appel, point téléphonique)",
  Autre: "Autre",
};
