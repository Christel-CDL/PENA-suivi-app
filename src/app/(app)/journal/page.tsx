import { getCurrentUser } from "@/lib/auth/session";
import { loadDossier } from "@/lib/data/dossier";
import { filterDossierBySite } from "@/lib/site-filter";
import { SiteFilterTabs } from "@/components/SiteFilterTabs";
import { canEditJournalEntry } from "@/lib/auth/rbac";
import { JournalForm } from "./JournalForm";
import { JournalEntryRow } from "./JournalEntryRow";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { site } = await searchParams;
  const fullDossier = await loadDossier(user);
  const dossier = filterDossierBySite(fullDossier, site);
  const tachesById = new Map(dossier.taches.map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Journal des actions</h1>
        <SiteFilterTabs sites={fullDossier.sites} />
      </div>

      <JournalForm />

      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {dossier.journal.length === 0 && <p className="p-4 text-sm text-slate-500">Aucune entrée.</p>}
        {dossier.journal.map((j) => (
          <JournalEntryRow
            key={j.id}
            entry={j}
            tache={j.tacheIds.map((id) => tachesById.get(id)).find(Boolean)}
            canEdit={canEditJournalEntry(user, j)}
          />
        ))}
      </div>
    </div>
  );
}
