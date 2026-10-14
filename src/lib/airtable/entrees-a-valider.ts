import "server-only";
import { listRecords, getRecord, updateRecords } from "./client";
import { TABLES, ENTREES_A_VALIDER_FIELDS as F } from "./constants";
import { createJournalEntry } from "./journal";

export type EntreeAValider = {
  id: string;
  dateEmail: string;
  expediteur: string;
  resumePropose: string;
  tacheSuggereeId: string | null;
  statut: string;
  /** Email par défaut (entrées n8n) ; Visite terrain pour les futurs rapports de constat. */
  origine: string;
  idMessageSource: string;
  lienDocument: string;
  /** Instructions relevées dans la source — jamais exécutées automatiquement. */
  actionsDemandees: string;
};

type RawFields = {
  [F.DATE_EMAIL]?: string;
  [F.EXPEDITEUR]?: string;
  [F.RESUME_PROPOSE]?: string;
  [F.TACHE_SUGGEREE]?: string[];
  [F.STATUT]?: string;
  [F.ENTREE_LIEE]?: string[];
  [F.ORIGINE]?: string;
  [F.ID_MESSAGE_SOURCE]?: string;
  [F.LIEN_DOCUMENT]?: string;
  [F.ACTIONS_DEMANDEES]?: string;
};

function mapEntree(r: { id: string; fields: RawFields }): EntreeAValider {
  return {
    id: r.id,
    dateEmail: r.fields[F.DATE_EMAIL] ?? "",
    expediteur: r.fields[F.EXPEDITEUR] ?? "",
    resumePropose: r.fields[F.RESUME_PROPOSE] ?? "",
    tacheSuggereeId: r.fields[F.TACHE_SUGGEREE]?.[0] ?? null,
    statut: r.fields[F.STATUT] ?? "",
    origine: r.fields[F.ORIGINE] || "Email",
    idMessageSource: r.fields[F.ID_MESSAGE_SOURCE] ?? "",
    lienDocument: r.fields[F.LIEN_DOCUMENT] ?? "",
    actionsDemandees: r.fields[F.ACTIONS_DEMANDEES] ?? "",
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
 * Valide une entrée : copie le résumé dans JOURNAL DES ACTIONS (avec son origine,
 * la date de l'e-mail, le lien éventuel et l'ID du message source — ce dernier sert
 * au dédoublonnage n8n, qui le cherche dans les deux tables),
 * puis marque l'entrée comme Validée et la relie à l'entrée de journal créée.
 * `resumeCorrige` permet à l'Admin de corriger le texte avant publication.
 */
export async function validerEntree(
  entree: EntreeAValider,
  input: { resumeCorrige: string; tacheIds: string[]; contactIds: string[] },
) {
  const journalEntry = await createJournalEntry({
    description: input.resumeCorrige,
    tacheIds: input.tacheIds,
    contactIds: input.contactIds,
    origine: entree.origine,
    date: entree.dateEmail || undefined,
    lienDocument: entree.lienDocument || undefined,
    idMessageSource: entree.idMessageSource || undefined,
  });

  await updateRecords<RawFields>(TABLES.ENTREES_A_VALIDER, [
    {
      id: entree.id,
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

export async function getEntreeAValider(id: string): Promise<EntreeAValider | null> {
  const record = await getRecord<RawFields>(TABLES.ENTREES_A_VALIDER, id);
  return record ? mapEntree(record) : null;
}
