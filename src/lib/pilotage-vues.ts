import type { Tache } from "@/lib/airtable/taches";
import type { Utilisateur } from "@/lib/airtable/users";
import { estOuvert, aujourdhui } from "@/lib/pilotage";

/**
 * Les 4 vues de pilotage du tableau de bord (brief v2, §1.2). Reçoit des
 * tâches DÉJÀ filtrées au périmètre de site de l'utilisateur (loadDossier) :
 * ce module ne fait que trier « qui a la balle », il n'accorde aucun accès.
 */

export const VUES = [
  { id: "a-moi", label: "À moi" },
  { id: "j-attends", label: "J'attends" },
  { id: "en-retard", label: "En retard" },
  { id: "cette-semaine", label: "Cette semaine" },
] as const;

export type VueId = (typeof VUES)[number]["id"];

function ajouterJours(dateIso: string, jours: number): string {
  const d = new Date(`${dateIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

function parProchainPoint(a: Tache, b: Tache): number {
  return (a.prochainPoint ?? "9999-12-31").localeCompare(b.prochainPoint ?? "9999-12-31");
}

export function vuesPilotage(user: Utilisateur, taches: Tache[]): Record<VueId, Tache[]> {
  const today = aujourdhui();
  const dansUneSemaine = ajouterJours(today, 7);
  const admin = user.role === "Admin";
  const estMonSujet = (t: Tache) => Boolean(user.contactId) && t.responsableContactIds.includes(user.contactId!);

  const ouverts = taches.filter((t) => estOuvert(t.statut));

  // Admin = Christel : « à moi » quand la balle est chez elle, « j'attends » sinon.
  // Contributeur : seulement ses sujets ; « à moi » quand la balle est chez PENA.
  const aMoi = admin
    ? ouverts.filter((t) => t.balleChez === "Christel")
    : ouverts.filter((t) => t.balleChez === "PENA" && estMonSujet(t));
  const jAttends = admin
    ? ouverts.filter((t) => ["PENA", "Prestataire", "Administration"].includes(t.balleChez))
    : ouverts.filter((t) => ["Christel", "Prestataire", "Administration"].includes(t.balleChez) && estMonSujet(t));

  return {
    "a-moi": aMoi.sort(parProchainPoint),
    "j-attends": jAttends.sort(parProchainPoint),
    "en-retard": ouverts.filter((t) => t.prochainPoint && t.prochainPoint < today).sort(parProchainPoint),
    "cette-semaine": ouverts
      .filter((t) => t.prochainPoint && t.prochainPoint >= today && t.prochainPoint <= dansUneSemaine)
      .sort(parProchainPoint),
  };
}
