import "server-only";
import { listRecords, getRecord, updateRecords, createRecords } from "./client";
import { TABLES, TACHES_FIELDS as F } from "./constants";

export type Tache = {
  id: string;
  nom: string;
  sousProjetIds: string[];
  statut: string;
  echeance: string | null;
  journalIds: string[];
  description: string;
  prochaineRelance: string | null;
  derniereRelance: string | null;
  priorite: string;
  responsableContactIds: string[];
  partiesPrenantesIds: string[];
  prestataireContactIds: string[];
  /** Ancienne valeur texte libre, conservée pour les tâches pas encore basculées vers un contact lié. */
  prestataireAncienTexte: string;
};

type RawFields = {
  [F.NOM]?: string;
  [F.SOUS_PROJET_ASSOCIE]?: string[];
  [F.STATUT]?: string;
  [F.ECHEANCE]?: string;
  [F.JOURNAL]?: string[];
  [F.DESCRIPTION_OBJECTIFS]?: string;
  [F.PROCHAINE_RELANCE]?: string;
  [F.DERNIERE_RELANCE]?: string;
  [F.PRIORITE]?: string;
  [F.RESPONSABLE_LIEN]?: string[];
  [F.PARTIES_PRENANTES]?: string[];
  [F.PRESTATAIRE_ANCIEN_TEXTE]?: string;
  [F.PRESTATAIRE_LIEN]?: string[];
};

function mapTache(r: { id: string; fields: RawFields }): Tache {
  return {
    id: r.id,
    nom: r.fields[F.NOM] ?? "",
    sousProjetIds: r.fields[F.SOUS_PROJET_ASSOCIE] ?? [],
    statut: r.fields[F.STATUT] ?? "",
    echeance: r.fields[F.ECHEANCE] ?? null,
    journalIds: r.fields[F.JOURNAL] ?? [],
    description: r.fields[F.DESCRIPTION_OBJECTIFS] ?? "",
    prochaineRelance: r.fields[F.PROCHAINE_RELANCE] ?? null,
    derniereRelance: r.fields[F.DERNIERE_RELANCE] ?? null,
    priorite: r.fields[F.PRIORITE] ?? "",
    responsableContactIds: r.fields[F.RESPONSABLE_LIEN] ?? [],
    partiesPrenantesIds: r.fields[F.PARTIES_PRENANTES] ?? [],
    prestataireContactIds: r.fields[F.PRESTATAIRE_LIEN] ?? [],
    prestataireAncienTexte: r.fields[F.PRESTATAIRE_ANCIEN_TEXTE] ?? "",
  };
}

export async function listTaches(): Promise<Tache[]> {
  const records = await listRecords<RawFields>(TABLES.TACHES);
  return records.map(mapTache);
}

export async function getTache(id: string): Promise<Tache | null> {
  const record = await getRecord<RawFields>(TABLES.TACHES, id);
  return record ? mapTache(record) : null;
}

/**
 * Modification d'une tâche — l'appelant DOIT avoir vérifié canEditTask() avant
 * d'appeler cette fonction. On ne fait pas confiance à la liste des champs
 * fournie : seuls les champs éditables par un Contributeur sont acceptés ici.
 */
export type TacheEditableInput = Partial<{
  statut: string;
  echeance: string | null;
  priorite: string;
  description: string;
  prestataireContactIds: string[];
}>;

export async function updateTacheFields(id: string, input: TacheEditableInput) {
  const fields: Partial<RawFields> = {};
  if (input.statut !== undefined) fields[F.STATUT] = input.statut;
  if (input.echeance !== undefined) fields[F.ECHEANCE] = input.echeance ?? undefined;
  if (input.priorite !== undefined) fields[F.PRIORITE] = input.priorite;
  if (input.description !== undefined) fields[F.DESCRIPTION_OBJECTIFS] = input.description;
  if (input.prestataireContactIds !== undefined) fields[F.PRESTATAIRE_LIEN] = input.prestataireContactIds;

  const [record] = await updateRecords<RawFields>(TABLES.TACHES, [{ id, fields }]);
  return mapTache(record);
}

/** Création directe — réservée à l'Admin (voir lib/auth/rbac.ts). */
export async function createTache(input: {
  nom: string;
  sousProjetIds: string[];
  responsableContactIds?: string[];
  description?: string;
}) {
  const [record] = await createRecords<RawFields>(TABLES.TACHES, [
    {
      fields: {
        [F.NOM]: input.nom,
        [F.SOUS_PROJET_ASSOCIE]: input.sousProjetIds,
        [F.RESPONSABLE_LIEN]: input.responsableContactIds ?? [],
        [F.DESCRIPTION_OBJECTIFS]: input.description ?? "",
        [F.STATUT]: "À faire",
      },
    },
  ]);
  return mapTache(record);
}
