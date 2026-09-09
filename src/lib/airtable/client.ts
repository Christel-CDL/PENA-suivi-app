import "server-only";
import { BASE_ID } from "./constants";

// Cache serveur court (voir section 3 du cahier des charges) : toute lecture passe par
// le cache de données de Next.js (revalidate: 20s) plutôt que de taper l'API Airtable
// à chaque requête. Une écriture invalide immédiatement le tag de la table concernée,
// pour que l'auteur voie son propre changement tout de suite ; les autres utilisateurs
// le voient au prochain rafraîchissement (max 20s).
const CACHE_SECONDS = 20;

function airtableTag(tableId: string) {
  return `airtable:${tableId}`;
}

function requireToken() {
  const token = process.env.AIRTABLE_PAT;
  if (!token) {
    throw new Error("AIRTABLE_PAT manquant dans les variables d'environnement.");
  }
  return token;
}

type AirtableFieldValue = unknown;

export type AirtableRecord<TFields extends Record<string, AirtableFieldValue> = Record<string, AirtableFieldValue>> = {
  id: string;
  createdTime: string;
  fields: TFields;
};

type ListParams = {
  filterByFormula?: string;
  sort?: { field: string; direction?: "asc" | "desc" }[];
  fields?: string[];
  maxRecords?: number;
};

async function airtableFetch(path: string, init: RequestInit & { next?: { revalidate?: number; tags?: string[] } }) {
  const res = await fetch(`https://api.airtable.com/v0/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireToken()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Airtable API ${res.status} sur ${path} : ${body}`);
  }
  return res.json();
}

/** Liste tous les enregistrements d'une table (pagine automatiquement). Lecture mise en cache 20s. */
export async function listRecords<TFields extends Record<string, AirtableFieldValue>>(
  tableId: string,
  params: ListParams = {},
): Promise<AirtableRecord<TFields>[]> {
  const records: AirtableRecord<TFields>[] = [];
  let offset: string | undefined;

  do {
    const search = new URLSearchParams();
    if (params.filterByFormula) search.set("filterByFormula", params.filterByFormula);
    if (params.maxRecords) search.set("maxRecords", String(params.maxRecords));
    if (params.fields) for (const f of params.fields) search.append("fields[]", f);
    if (params.sort) {
      params.sort.forEach((s, i) => {
        search.set(`sort[${i}][field]`, s.field);
        search.set(`sort[${i}][direction]`, s.direction ?? "asc");
      });
    }
    if (offset) search.set("offset", offset);

    const data = await airtableFetch(`${BASE_ID}/${tableId}?${search.toString()}`, {
      method: "GET",
      next: { revalidate: CACHE_SECONDS, tags: [airtableTag(tableId)] },
    });
    records.push(...(data.records as AirtableRecord<TFields>[]));
    offset = data.offset;
  } while (offset);

  return records;
}

/** Récupère un enregistrement par ID. Lecture mise en cache 20s. */
export async function getRecord<TFields extends Record<string, AirtableFieldValue>>(
  tableId: string,
  recordId: string,
): Promise<AirtableRecord<TFields> | null> {
  try {
    const data = await airtableFetch(`${BASE_ID}/${tableId}/${recordId}`, {
      method: "GET",
      next: { revalidate: CACHE_SECONDS, tags: [airtableTag(tableId)] },
    });
    return data as AirtableRecord<TFields>;
  } catch (err) {
    if (err instanceof Error && err.message.includes(" 404 ")) return null;
    throw err;
  }
}

/** Crée un ou plusieurs enregistrements (max 10 par appel, limite Airtable). */
export async function createRecords<TFields extends Record<string, AirtableFieldValue>>(
  tableId: string,
  records: { fields: Partial<TFields> }[],
): Promise<AirtableRecord<TFields>[]> {
  const data = await airtableFetch(`${BASE_ID}/${tableId}`, {
    method: "POST",
    body: JSON.stringify({ records, typecast: true }),
    cache: "no-store",
  });
  const { updateTag } = await import("next/cache");
  updateTag(airtableTag(tableId));
  return data.records as AirtableRecord<TFields>[];
}

/** Met à jour un ou plusieurs enregistrements (PATCH = ne touche que les champs fournis). */
export async function updateRecords<TFields extends Record<string, AirtableFieldValue>>(
  tableId: string,
  records: { id: string; fields: Partial<TFields> }[],
): Promise<AirtableRecord<TFields>[]> {
  const data = await airtableFetch(`${BASE_ID}/${tableId}`, {
    method: "PATCH",
    body: JSON.stringify({ records, typecast: true }),
    cache: "no-store",
  });
  const { updateTag } = await import("next/cache");
  updateTag(airtableTag(tableId));
  return data.records as AirtableRecord<TFields>[];
}
