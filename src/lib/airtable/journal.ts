import "server-only";
import { listRecords, createRecords } from "./client";
import { TABLES, JOURNAL_FIELDS as F } from "./constants";

export type JournalEntry = {
  id: string;
  description: string;
  date: string;
  tacheIds: string[];
  contactIds: string[];
  documentIds: string[];
  suites: string;
  origine: string;
};

type RawFields = {
  [F.DESCRIPTION]?: string;
  [F.DATE]?: string;
  [F.TACHE_ASSOCIEE]?: string[];
  [F.CONTACT_ASSOCIE]?: string[];
  [F.DOCUMENT_ASSOCIE]?: string[];
  [F.SUITES]?: string;
  [F.ORIGINE]?: string;
};

function mapEntry(r: { id: string; fields: RawFields }): JournalEntry {
  return {
    id: r.id,
    description: r.fields[F.DESCRIPTION] ?? "",
    date: r.fields[F.DATE] ?? "",
    tacheIds: r.fields[F.TACHE_ASSOCIEE] ?? [],
    contactIds: r.fields[F.CONTACT_ASSOCIE] ?? [],
    documentIds: r.fields[F.DOCUMENT_ASSOCIE] ?? [],
    suites: r.fields[F.SUITES] ?? "",
    origine: r.fields[F.ORIGINE] ?? "",
  };
}

export async function listJournalEntries(): Promise<JournalEntry[]> {
  const records = await listRecords<RawFields>(TABLES.JOURNAL, {
    sort: [{ field: F.DATE, direction: "desc" }],
  });
  return records.map(mapEntry);
}

/**
 * Ajoute une entrée de journal. L'auteur (contact lié) est déterminé par la
 * session connectée côté appelant — jamais ressaisi (voir section 6).
 */
export async function createJournalEntry(input: {
  description: string;
  tacheIds: string[];
  contactIds: string[];
  origine: string;
}) {
  const [record] = await createRecords<RawFields>(TABLES.JOURNAL, [
    {
      fields: {
        [F.DESCRIPTION]: input.description,
        [F.DATE]: new Date().toISOString(),
        [F.TACHE_ASSOCIEE]: input.tacheIds,
        [F.CONTACT_ASSOCIE]: input.contactIds,
        [F.ORIGINE]: input.origine,
      },
    },
  ]);
  return mapEntry(record);
}

/**
 * Détection de la tâche associée à partir de mots-clés dans la description.
 * Reprend la logique du prototype existant : on cherche, parmi les mots
 * significatifs (4 lettres et plus) de la description saisie, ceux qui
 * apparaissent aussi dans le nom d'une tâche ; la tâche avec le plus de mots en
 * commun est retenue si au moins un mot correspond.
 */
export function detectRelatedTaskId(
  description: string,
  taches: { id: string; nom: string }[],
): string | null {
  const words = description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);

  if (words.length === 0) return null;

  let bestId: string | null = null;
  let bestScore = 0;

  for (const tache of taches) {
    const taskWords = new Set(
      tache.nom
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4),
    );
    const score = words.filter((w) => taskWords.has(w)).length;
    if (score > bestScore) {
      bestScore = score;
      bestId = tache.id;
    }
  }

  return bestScore > 0 ? bestId : null;
}
