import type { Dossier } from "@/lib/data/dossier";

/**
 * Applique le filtre de site "permanent" (section 6) : narrows le dossier déjà
 * scopé (loadDossier) à un seul site choisi par l'utilisateur dans l'interface.
 * Ne peut jamais ÉLARGIR l'accès — si le site demandé n'est pas dans
 * dossier.sites (donc pas autorisé), il est simplement ignoré.
 */
export function filterDossierBySite(dossier: Dossier, siteId: string | undefined): Dossier {
  if (!siteId || siteId === "all") return dossier;
  const site = dossier.sites.find((s) => s.id === siteId);
  if (!site) return dossier;

  const sites = [site];
  const sousProjets = dossier.sousProjets.filter((sp) => sp.projetIds.includes(siteId));
  const sousProjetIds = new Set(sousProjets.map((sp) => sp.id));
  const taches = dossier.taches.filter((t) => t.sousProjetIds.some((id) => sousProjetIds.has(id)));
  const tacheIds = new Set(taches.map((t) => t.id));
  const journal = dossier.journal.filter((j) => j.tacheIds.some((id) => tacheIds.has(id)));
  const contacts = dossier.contacts.filter((c) => c.projetIds.includes(siteId));
  const documents = dossier.documents.filter((d) => d.projetIds.includes(siteId));
  const planningVisites = dossier.planningVisites.filter((v) => v.siteIds.includes(siteId));

  return { ...dossier, sites, sousProjets, taches, journal, contacts, documents, planningVisites };
}
