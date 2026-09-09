import "server-only";
import { listRecords } from "./client";
import { TABLES, DOCUMENTS_FIELDS as F } from "./constants";

export type DocumentCr = {
  id: string;
  titre: string;
  type: string;
  date: string | null;
  projetIds: string[];
};

type RawFields = {
  [F.TITRE]?: string;
  [F.TYPE]?: string;
  [F.DATE]?: string;
  [F.PROJET_ASSOCIE]?: string[];
};

export async function listDocuments(): Promise<DocumentCr[]> {
  const records = await listRecords<RawFields>(TABLES.DOCUMENTS);
  return records.map((r) => ({
    id: r.id,
    titre: r.fields[F.TITRE] ?? "",
    type: r.fields[F.TYPE] ?? "",
    date: r.fields[F.DATE] ?? null,
    projetIds: r.fields[F.PROJET_ASSOCIE] ?? [],
  }));
}
