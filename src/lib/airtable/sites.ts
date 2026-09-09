import "server-only";
import { listRecords } from "./client";
import { TABLES, SITES_FIELDS as F } from "./constants";

export type Site = {
  id: string;
  nom: string;
  adresse: string;
  regime: string;
  statut: string;
  sousProjetIds: string[];
};

type RawFields = {
  [F.NOM]?: string;
  [F.ADRESSE]?: string;
  [F.REGIME]?: string;
  [F.STATUT]?: string;
  [F.SOUS_PROJETS]?: string[];
};

export async function listSites(): Promise<Site[]> {
  const records = await listRecords<RawFields>(TABLES.SITES);
  return records.map((r) => ({
    id: r.id,
    nom: r.fields[F.NOM] ?? "",
    adresse: r.fields[F.ADRESSE] ?? "",
    regime: r.fields[F.REGIME] ?? "",
    statut: r.fields[F.STATUT] ?? "",
    sousProjetIds: r.fields[F.SOUS_PROJETS] ?? [],
  }));
}
