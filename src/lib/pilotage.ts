import { BALLE_CHEZ, TACHE_STATUTS_CLOS } from "@/lib/airtable/constants";

/**
 * Règle métier v2 (brief du 14/10/2026, §0.2) : tout sujet ouvert doit avoir
 * une prochaine étape, un « Balle chez » et une date de prochain point. Ce
 * module est partagé par toutes les Server Actions qui créent, rouvrent ou
 * modifient un sujet — le contrôle ne doit jamais vivre seulement dans l'UI.
 */

export type Pilotage = {
  prochaineEtape: string;
  balleChez: string;
  prochainPoint: string | null;
};

export function estOuvert(statut: string): boolean {
  return !(TACHE_STATUTS_CLOS as readonly string[]).includes(statut);
}

/** Lit les trois champs depuis un formulaire (noms d'input communs à tous les formulaires). */
export function lirePilotage(formData: FormData): Pilotage {
  const balleChez = String(formData.get("balleChez") ?? "").trim();
  return {
    prochaineEtape: String(formData.get("prochaineEtape") ?? "").trim(),
    // Valeur hors liste (requête bricolée) : traitée comme vide, donc refusée sur un sujet ouvert.
    balleChez: (BALLE_CHEZ as readonly string[]).includes(balleChez) ? balleChez : "",
    prochainPoint: String(formData.get("prochainPoint") ?? "").trim() || null,
  };
}

/** Libellés des champs obligatoires manquants (vide si le sujet est clos ou complet). */
export function champsManquants(statut: string, p: Pilotage): string[] {
  if (!estOuvert(statut)) return [];
  const manquants: string[] = [];
  if (!p.prochaineEtape) manquants.push("Prochaine étape");
  if (!p.balleChez) manquants.push("Balle chez");
  if (!p.prochainPoint) manquants.push("Prochain point");
  return manquants;
}

/**
 * Message affiché quand on tente d'enregistrer un sujet ouvert incomplet.
 * Le brief demande un message « explicite » : il doit dire quoi remplir.
 */
export function messageChampsManquants(manquants: string[]): string {
  const noms = manquants.map((m) => `« ${m} »`);
  const liste = noms.length > 1 ? `${noms.slice(0, -1).join(", ")} et ${noms.at(-1)}` : noms[0];
  const champ = manquants.length > 1 ? `les champs ${liste} sont vides` : `le champ ${liste} est vide`;
  return (
    `Non enregistré : ${champ}. Un sujet ouvert doit toujours indiquer la prochaine étape, qui a la balle ` +
    `et la date du prochain point. Complétez-les, ou passez le statut à « Terminé » ou « Annulée ».`
  );
}

/** Date du jour à Paris, au format AAAA-MM-JJ (comparable aux champs date d'Airtable). */
export function aujourdhui(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
}

/** Prochain point dépassé : seulement pour un sujet ouvert. */
export function pointDepasse(statut: string, prochainPoint: string | null): boolean {
  return Boolean(prochainPoint) && estOuvert(statut) && prochainPoint! < aujourdhui();
}
