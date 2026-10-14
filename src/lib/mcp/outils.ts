import "server-only";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Utilisateur } from "@/lib/airtable/users";
import type { Tache } from "@/lib/airtable/taches";
import { loadDossier, type Dossier } from "@/lib/data/dossier";
import { filterDossierBySite } from "@/lib/site-filter";
import { estOuvert, pointDepasse, aujourdhui } from "@/lib/pilotage";
import { VUES, vuesPilotage, type VueId } from "@/lib/pilotage-vues";
import { urlApp } from "@/lib/auth/oauth";

/**
 * Outils du connecteur MCP « Suivi PENA » — phase 1 : LECTURE SEULE.
 * Chaque appel recharge le dossier avec loadDossier(user) : même périmètre de
 * site que l'application, droits relus dans Airtable à chaque requête.
 */

const LECTURE = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;
const MAX_LIGNES = 60;

const normaliser = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function resultat(donnees: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(donnees, null, 1) }] };
}
function erreur(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

/** Site désigné par un ID ou un bout de nom (« PE », « environnement », « métaux »). */
function trouverSite(d: Dossier, site?: string) {
  if (!site) return { id: undefined as string | undefined };
  const q = normaliser(site.trim());
  const alias: Record<string, string> = { pm: "metaux", pe: "environnement", pl: "logistic" };
  const cible = alias[q] ?? q;
  const s = d.sites.find((x) => x.id === site || normaliser(x.nom).includes(cible));
  return s ? { id: s.id } : { erreur: `Site « ${site} » introuvable ou hors de votre périmètre. Sites : ${d.sites.map((x) => x.nom).join(", ")}.` };
}

function contexte(d: Dossier) {
  const contacts = new Map(d.contacts.map((c) => [c.id, c.nom]));
  const volets = new Map(d.sousProjets.map((sp) => [sp.id, sp]));
  const sites = new Map(d.sites.map((s) => [s.id, s.nom]));
  const noms = (ids: string[]) => ids.map((id) => contacts.get(id)).filter(Boolean).join(", ");
  const sujet = (t: Tache) => {
    const volet = volets.get(t.sousProjetIds[0]);
    return {
      id: t.id,
      nom: t.nom,
      volet: volet?.nom ?? "",
      site: (volet?.projetIds[0] && sites.get(volet.projetIds[0])) || "",
      statut: t.statut,
      priorite: t.priorite,
      balle_chez: t.balleChez,
      prochaine_etape: t.prochaineEtape,
      prochain_point: t.prochainPoint,
      prochain_point_depasse: pointDepasse(t.statut, t.prochainPoint),
      responsable: noms(t.responsableContactIds),
      echeance: t.echeance,
      lien: `${urlApp()}/taches/${t.id}`,
    };
  };
  return { noms, sujet, volets, sites };
}

export function creerServeurMcp(user: Utilisateur): McpServer {
  const serveur = new McpServer(
    { name: "suivi-pena", version: "1.0.0" },
    {
      instructions:
        "Suivi du dossier ICPE de PENA Métaux (PM) et PENA Environnement (PE). Structure : site → volet → sujet ; " +
        "chaque sujet ouvert a une prochaine étape, un « balle chez » (Christel, PENA, Prestataire, Administration) " +
        "et une date de prochain point. Commencer par vues_pilotage pour « où on en est ». Données confidentielles, " +
        "lecture seule : pour modifier, renvoyer vers le lien de la fiche dans l'application.",
    },
  );

  serveur.registerTool(
    "vues_pilotage",
    {
      title: "Vues de pilotage",
      description:
        "Les 4 vues du tableau de bord : a-moi (balle chez l'utilisateur), j-attends (balle chez les autres), " +
        "en-retard (prochain point dépassé), cette-semaine (prochain point dans les 7 jours). Sans `vue`, renvoie les 4.",
      inputSchema: {
        vue: z.enum(VUES.map((v) => v.id) as [VueId, ...VueId[]]).optional().describe("Une seule vue (sinon les 4)."),
        site: z.string().optional().describe("Filtre de site : PM, PE, ou un nom de site."),
      },
      annotations: LECTURE,
    },
    async ({ vue, site }) => {
      const complet = await loadDossier(user);
      const s = trouverSite(complet, site);
      if ("erreur" in s) return erreur(s.erreur!);
      const d = filterDossierBySite(complet, s.id);
      const { sujet } = contexte(d);
      const vues = vuesPilotage(user, d.taches);
      const choisies = vue ? VUES.filter((v) => v.id === vue) : VUES;
      return resultat({
        aujourdhui: aujourdhui(),
        utilisateur: user.nom,
        compteurs: Object.fromEntries(VUES.map((v) => [v.id, vues[v.id].length])),
        vues: Object.fromEntries(choisies.map((v) => [v.id, vues[v.id].slice(0, MAX_LIGNES).map(sujet)])),
      });
    },
  );

  serveur.registerTool(
    "lister_volets",
    {
      title: "Volets du dossier",
      description: "Liste des volets (regroupements de sujets) par site, avec le nombre de sujets ouverts et terminés.",
      inputSchema: { site: z.string().optional().describe("PM, PE, ou un nom de site.") },
      annotations: LECTURE,
    },
    async ({ site }) => {
      const complet = await loadDossier(user);
      const s = trouverSite(complet, site);
      if ("erreur" in s) return erreur(s.erreur!);
      const d = filterDossierBySite(complet, s.id);
      const { sites } = contexte(d);
      return resultat(
        d.sousProjets.map((sp) => {
          const taches = d.taches.filter((t) => t.sousProjetIds.includes(sp.id));
          return {
            id: sp.id,
            nom: sp.nom,
            site: (sp.projetIds[0] && sites.get(sp.projetIds[0])) || "",
            statut: sp.statut,
            sujets_ouverts: taches.filter((t) => estOuvert(t.statut)).length,
            sujets_termines: taches.filter((t) => !estOuvert(t.statut)).length,
          };
        }),
      );
    },
  );

  serveur.registerTool(
    "lister_sujets",
    {
      title: "Sujets d'un volet ou d'un site",
      description: "Sujets (tâches) avec leur pilotage. Par défaut, seulement les sujets ouverts.",
      inputSchema: {
        volet: z.string().optional().describe("ID du volet ou mot de son nom (ex. « pluviales »)."),
        site: z.string().optional().describe("PM, PE, ou un nom de site."),
        inclure_termines: z.boolean().optional().describe("Inclure les sujets terminés ou annulés."),
      },
      annotations: LECTURE,
    },
    async ({ volet, site, inclure_termines }) => {
      const complet = await loadDossier(user);
      const s = trouverSite(complet, site);
      if ("erreur" in s) return erreur(s.erreur!);
      const d = filterDossierBySite(complet, s.id);
      const { sujet } = contexte(d);
      let ids: Set<string> | null = null;
      if (volet) {
        const q = normaliser(volet);
        const trouves = d.sousProjets.filter((sp) => sp.id === volet || normaliser(sp.nom).includes(q));
        if (trouves.length === 0) return erreur(`Aucun volet ne correspond à « ${volet} ». Utilisez lister_volets.`);
        ids = new Set(trouves.map((sp) => sp.id));
      }
      const liste = d.taches
        .filter((t) => (inclure_termines || estOuvert(t.statut)) && (!ids || t.sousProjetIds.some((id) => ids!.has(id))))
        .sort((a, b) => (a.prochainPoint ?? "9999").localeCompare(b.prochainPoint ?? "9999"));
      return resultat({ nombre: liste.length, sujets: liste.slice(0, MAX_LIGNES).map(sujet) });
    },
  );

  serveur.registerTool(
    "fiche_sujet",
    {
      title: "Fiche d'un sujet",
      description: "Détail d'un sujet et historique complet de son journal (comptes-rendus, e-mails validés…).",
      inputSchema: { id: z.string().describe("ID du sujet (rec…), obtenu par une autre requête.") },
      annotations: LECTURE,
    },
    async ({ id }) => {
      const d = await loadDossier(user);
      const t = d.taches.find((x) => x.id === id);
      // Même réponse qu'un sujet inexistant : ne pas révéler un sujet hors périmètre.
      if (!t) return erreur("Sujet introuvable ou hors de votre périmètre.");
      const { sujet, noms } = contexte(d);
      const journal = d.journal
        .filter((j) => j.tacheIds.includes(id))
        .map((j) => ({
          date: j.date,
          origine: j.origine,
          auteur: noms(j.contactIds),
          participants: noms(j.participantIds),
          texte: j.description,
          suites: j.suites || undefined,
          lien_document: j.lienDocument || undefined,
        }));
      return resultat({
        ...sujet(t),
        description: t.description,
        parties_prenantes: noms(t.partiesPrenantesIds),
        prestataires: noms(t.prestataireContactIds) || t.prestataireAncienTexte,
        journal,
      });
    },
  );

  serveur.registerTool(
    "rechercher",
    {
      title: "Recherche",
      description: "Recherche par mots dans les sujets (nom, prochaine étape, description) et dans le journal.",
      inputSchema: { texte: z.string().min(2).describe("Mots à chercher (tous doivent apparaître).") },
      annotations: LECTURE,
    },
    async ({ texte }) => {
      const d = await loadDossier(user);
      const { sujet } = contexte(d);
      const mots = normaliser(texte).split(/\s+/).filter(Boolean);
      const contient = (s: string) => {
        const n = normaliser(s);
        return mots.every((m) => n.includes(m));
      };
      const nomsSujets = new Map(d.taches.map((t) => [t.id, t.nom]));
      const sujets = d.taches.filter((t) => contient(`${t.nom} ${t.prochaineEtape} ${t.description}`));
      const journal = d.journal.filter((j) => contient(j.description));
      return resultat({
        sujets: sujets.slice(0, 25).map(sujet),
        journal: journal.slice(0, 25).map((j) => ({
          date: j.date,
          origine: j.origine,
          sujet: j.tacheIds.map((id) => nomsSujets.get(id)).filter(Boolean).join(", "),
          sujet_id: j.tacheIds[0],
          texte: j.description,
        })),
      });
    },
  );

  return serveur;
}
