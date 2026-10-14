import { TYPES_COMPTE_RENDU } from "@/lib/airtable/constants";

export { TYPES_COMPTE_RENDU };

export const LIBELLES_TYPE: Record<(typeof TYPES_COMPTE_RENDU)[number], string> = {
  "Visite terrain": "Visite terrain",
  "Réunion / Entretien": "Réunion / Entretien",
  "Point dossier": "Point dossier (appel, point téléphonique)",
  Autre: "Autre",
};
