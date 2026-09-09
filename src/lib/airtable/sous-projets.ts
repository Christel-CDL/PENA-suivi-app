import "server-only";
import { listRecords, createRecords } from "./client";
import { TABLES, SOUS_PROJETS_FIELDS as F } from "./constants";

export type SousProjet = {
  id: string;
  nom: string;
  projetIds: string[];
  description: string;
  statut: string;
  dateFin: string | null;
  tacheIds: string[];
};

type RawFields = {
  [F.NOM]?: string;
  [F.PROJET_ASSOCIE]?: string[];
  [F.DESCRIPTION]?: string;
  [F.STATUT]?: string;
  [F.DATE_FIN]?: string;
  [F.TACHES]?: string[];
};

export async function listSousProjets(): Promise<SousProjet[]> {
  const records = await listRecords<RawFields>(TABLES.SOUS_PROJETS);
  return records.map((r) => ({
    id: r.id,
    nom: r.fields[F.NOM] ?? "",
    projetIds: r.fields[F.PROJET_ASSOCIE] ?? [],
    description: r.fields[F.DESCRIPTION] ?? "",
    statut: r.fields[F.STATUT] ?? "",
    dateFin: r.fields[F.DATE_FIN] ?? null,
    tacheIds: r.fields[F.TACHES] ?? [],
  }));
}

/** Création directe — réservée à l'Admin (voir lib/auth/rbac.ts). */
export async function createSousProjet(input: { nom: string; projetIds: string[]; description?: string }) {
  const [record] = await createRecords<RawFields>(TABLES.SOUS_PROJETS, [
    {
      fields: {
        [F.NOM]: input.nom,
        [F.PROJET_ASSOCIE]: input.projetIds,
        [F.DESCRIPTION]: input.description ?? "",
        [F.STATUT]: "Planifié",
      },
    },
  ]);
  return record;
}
