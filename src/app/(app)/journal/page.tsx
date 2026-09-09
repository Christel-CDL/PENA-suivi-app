import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { loadDossier } from "@/lib/data/dossier";
import { filterDossierBySite } from "@/lib/site-filter";
import { SiteFilterTabs } from "@/components/SiteFilterTabs";
import { formatDateTime } from "@/lib/format";
import { JournalForm } from "./JournalForm";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { site } = await searchParams;
  const dossier = filterDossierBySite(await loadDossier(user), site);
  const tachesById = new Map(dossier.taches.map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Journal des actions</h1>
        <SiteFilterTabs sites={dossier.sites} />
      </div>

      <JournalForm />

      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {dossier.journal.length === 0 && <p className="p-4 text-sm text-slate-500">Aucune entrée.</p>}
        {dossier.journal.map((j) => {
          const tache = j.tacheIds.map((id) => tachesById.get(id)).find(Boolean);
          return (
            <div key={j.id} className="p-4 text-sm">
              <p className="whitespace-pre-wrap text-slate-800">{j.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <span>{formatDateTime(j.date)}</span>
                <span>{j.origine}</span>
                {tache && (
                  <Link href={`/taches/${tache.id}`} className="text-slate-500 underline hover:text-slate-900">
                    {tache.nom}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
