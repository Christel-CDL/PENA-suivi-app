import "server-only";
import { listRecords, updateRecords } from "./client";
import { TABLES, ENTREES_A_VALIDER_FIELDS as F } from "./constants";
import { createJournalEntry } from "./journal";

export type EntreeAValider = {
  id: string;
  dateEmail: string;
  expediteur: string;
  resumePropose: string;
  tacheSuggereeId: string | null;
  statut: string;
};

type RawFields = {
  [F.DATE_EMAIL]?: string;
  [F.EXPEDITEUR]?: string;
  [F.RESUME_PROPOSE]?: string;
  [F.TACHE_SUGGEREE]?: string[];
  [F.STATUT]?: string;
  [F.ENTREE_LIEE]?: string[];
};

function mapEntree(r: { id: string; fields: RawFields }): EntreeAValider {
  return {
    id: r.id,
    dateEmail: r.fields[F.DATE_EMAIL] ?? "",
    expediteur: r.fields[F.EXPEDITEUR] ?? "",
    resumePropose: r.fields[F.RESUME_PROPOSE] ?? "",
    tacheSuggereeId: r.fields[F.TACHE_SUGGEREE]?.[0] ?? null,
    statut: r.fields[F.STATUT] ?? "",
  };
}

/** Réservé à l'Admin (voir lib/auth/rbac.ts) — écran "Entrées à valider". */
export async function listEntreesAValider(): Promise<EntreeAValider[]> {
  const records = await listRecords<RawFields>(TABLES.ENTREES_A_VALIDER, {
    sort: [{ field: F.DATE_EMAIL, direction: "desc" }],
  });
  return records.map(mapEntree);
}

/**
 * Valide une entrée : copie le résumé dans JOURNAL DES ACTIONS (origine "Email"),
 * puis marque l'entrée comme Validée et la relie à l'entrée de journal créée.
 * `resumeCorrige` permet à l'Admin de corriger le texte avant publication.
 */
export async function validerEntree(
  id: string,
  input: { resumeCorrige: string; tacheIds: string[]; contactIds: string[] },
) {
  const journalEntry = await createJournalEntry({
    description: input.resumeCorrige,
    tacheIds: input.tacheIds,
    contactIds: input.contactIds,
    origine: "Email",
  });

  await updateRecords<RawFields>(TABLES.ENTREES_A_VALIDER, [
    {
      id,
      fields: {
        [F.STATUT]: "Validée",
        [F.ENTREE_LIEE]: [journalEntry.id],
      },
    },
  ]);

  return journalEntry;
}

export async function rejeterEntree(id: string) {
  await updateRecords<RawFields>(TABLES.ENTREES_A_VALIDER, [
    { id, fields: { [F.STATUT]: "Rejetée" } },
  ]);
}
