import "server-only";
import { listRecords, createRecords, updateRecords } from "./client";
import { TABLES, DEMANDES_FIELDS as F } from "./constants";
import { createSousProjet } from "./sous-projets";
import { createTache } from "./taches";

export type Demande = {
  id: string;
  titrePropose: string;
  type: string;
  demandeurIds: string[];
  dateDemande: string | null;
  siteIds: string[];
  sousProjetParentIds: string[];
  description: string;
  statut: string;
};

type RawFields = {
  [F.TITRE_PROPOSE]?: string;
  [F.TYPE]?: string;
  [F.DEMANDEUR]?: string[];
  [F.DATE_DEMANDE]?: string;
  [F.SITE_CONCERNE]?: string[];
  [F.SOUS_PROJET_PARENT]?: string[];
  [F.DESCRIPTION_JUSTIFICATION]?: string;
  [F.STATUT]?: string;
  [F.SOUS_PROJET_CREE]?: string[];
  [F.TACHE_CREEE]?: string[];
};

function mapDemande(r: { id: string; fields: RawFields }): Demande {
  return {
    id: r.id,
    titrePropose: r.fields[F.TITRE_PROPOSE] ?? "",
    type: r.fields[F.TYPE] ?? "",
    demandeurIds: r.fields[F.DEMANDEUR] ?? [],
    dateDemande: r.fields[F.DATE_DEMANDE] ?? null,
    siteIds: r.fields[F.SITE_CONCERNE] ?? [],
    sousProjetParentIds: r.fields[F.SOUS_PROJET_PARENT] ?? [],
    description: r.fields[F.DESCRIPTION_JUSTIFICATION] ?? "",
    statut: r.fields[F.STATUT] ?? "",
  };
}

export async function listDemandes(): Promise<Demande[]> {
  const records = await listRecords<RawFields>(TABLES.DEMANDES, {
    sort: [{ field: F.DATE_DEMANDE, direction: "desc" }],
  });
  return records.map(mapDemande);
}

/** Soumission par un Contributeur — jamais de création directe (voir section 5). */
export async function creerDemande(input: {
  titre: string;
  type: string;
  demandeurId: string;
  siteIds: string[];
  sousProjetParentIds: string[];
  description: string;
}) {
  const [record] = await createRecords<RawFields>(TABLES.DEMANDES, [
    {
      fields: {
        [F.TITRE_PROPOSE]: input.titre,
        [F.TYPE]: input.type,
        [F.DEMANDEUR]: [input.demandeurId],
        [F.DATE_DEMANDE]: new Date().toISOString().slice(0, 10),
        [F.SITE_CONCERNE]: input.siteIds,
        [F.SOUS_PROJET_PARENT]: input.sousProjetParentIds,
        [F.DESCRIPTION_JUSTIFICATION]: input.description,
        [F.STATUT]: "En attente",
      },
    },
  ]);
  return mapDemande(record);
}

/**
 * Acceptation par l'Admin : crée réellement le sous-projet ou la tâche, lie
 * l'élément créé à la demande, et passe son statut à "Acceptée".
 */
export async function accepterDemande(demande: Demande) {
  if (demande.type === "Nouveau sous-projet") {
    const created = await createSousProjet({
      nom: demande.titrePropose,
      projetIds: demande.siteIds,
      description: demande.description,
    });
    await updateRecords<RawFields>(TABLES.DEMANDES, [
      { id: demande.id, fields: { [F.STATUT]: "Acceptée", [F.SOUS_PROJET_CREE]: [created.id] } },
    ]);
    return created;
  }

  const created = await createTache({
    nom: demande.titrePropose,
    sousProjetIds: demande.sousProjetParentIds,
    description: demande.description,
  });
  await updateRecords<RawFields>(TABLES.DEMANDES, [
    { id: demande.id, fields: { [F.STATUT]: "Acceptée", [F.TACHE_CREEE]: [created.id] } },
  ]);
  return created;
}

export async function refuserDemande(id: string) {
  await updateRecords<RawFields>(TABLES.DEMANDES, [
    { id, fields: { [F.STATUT]: "Refusée" } },
  ]);
}
