import "server-only";
import { listRecords } from "./client";
import { TABLES, PLANNING_VISITES_FIELDS as F } from "./constants";

export type VisitePlanning = {
  id: string;
  titre: string;
  date: string;
  siteIds: string[];
};

type RawFields = {
  [F.TITRE]?: string;
  [F.DATE]?: string;
  [F.SITE]?: string[];
};

function mapVisite(r: { id: string; fields: RawFields }): VisitePlanning {
  return {
    id: r.id,
    titre: r.fields[F.TITRE] ?? "",
    date: r.fields[F.DATE] ?? "",
    siteIds: r.fields[F.SITE] ?? [],
  };
}

/**
 * Jours de présence de Christel sur site, synchronisés depuis son calendrier
 * Outlook par le workflow n8n dédié — jamais modifiés manuellement dans l'app.
 */
export async function listPlanningVisites(): Promise<VisitePlanning[]> {
  const records = await listRecords<RawFields>(TABLES.PLANNING_VISITES, {
    sort: [{ field: F.DATE, direction: "asc" }],
  });
  return records.map(mapVisite);
}
