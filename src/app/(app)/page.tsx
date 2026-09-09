import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { loadDossier } from "@/lib/data/dossier";
import { filterDossierBySite } from "@/lib/site-filter";
import { SiteFilterTabs } from "@/components/SiteFilterTabs";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { site } = await searchParams;
  const dossier = filterDossierBySite(await loadDossier(user), site);
  const { sites, taches, journal } = dossier;

  const today = new Date().toISOString().slice(0, 10);
  const enCours = taches.filter((t) => t.statut === "En cours").length;
  const aEngager = taches.filter((t) => t.statut === "À faire").length;
  const prioritaires = taches.filter((t) => t.priorite === "Urgente" || t.priorite === "Haute").length;
  const enRetard = taches.filter(
    (t) => t.echeance && t.echeance < today && t.statut !== "Terminé" && t.statut !== "Annulée",
  ).length;

  const prochainesEcheances = taches
    .filter((t) => t.echeance && t.echeance >= today && t.statut !== "Terminé" && t.statut !== "Annulée")
    .sort((a, b) => (a.echeance! < b.echeance! ? -1 : 1))
    .slice(0, 6);

  const dernieresEntrees = journal.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Tableau de bord</h1>
        <SiteFilterTabs sites={sites} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Tâches suivies" value={taches.length} />
        <Stat label="En cours" value={enCours} />
        <Stat label="À engager" value={aEngager} />
        <Stat label="Priorité haute / urgente" value={prioritaires} />
        <Stat label="Échéances dépassées" value={enRetard} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Sites suivis</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {sites.map((s) => (
            <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-medium text-slate-900">{s.nom}</p>
              <p className="text-sm text-slate-500">{s.regime}</p>
              <div className="mt-2">
                <StatusBadge value={s.statut} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Prochaines échéances</h2>
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {prochainesEcheances.length === 0 && (
              <p className="p-4 text-sm text-slate-500">Aucune échéance à venir.</p>
            )}
            {prochainesEcheances.map((t) => (
              <Link
                key={t.id}
                href={`/taches/${t.id}`}
                className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-slate-50"
              >
                <span className="text-slate-800">{t.nom}</span>
                <span className="whitespace-nowrap text-slate-500">{formatDate(t.echeance)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Dernières entrées de journal</h2>
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {dernieresEntrees.length === 0 && (
              <p className="p-4 text-sm text-slate-500">Aucune entrée récente.</p>
            )}
            {dernieresEntrees.map((j) => (
              <div key={j.id} className="p-3 text-sm">
                <p className="text-slate-800 line-clamp-2">{j.description}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(j.date)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
