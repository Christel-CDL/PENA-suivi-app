import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { estOuvert, pointDepasse } from "@/lib/pilotage";
import type { Tache } from "@/lib/airtable/taches";

/** En-tête « où on en est » d'un sujet : prochaine étape, balle chez, prochain point. */
export function PilotageBandeau({ tache }: { tache: Tache }) {
  const depasse = pointDepasse(tache.statut, tache.prochainPoint);
  const incomplet = estOuvert(tache.statut) && (!tache.prochaineEtape || !tache.balleChez || !tache.prochainPoint);

  return (
    <div className="grid gap-3 rounded-lg border border-slate-300 bg-slate-50 p-4 sm:grid-cols-[1fr_auto_auto]">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Prochaine étape</p>
        <p className="whitespace-pre-wrap text-sm text-slate-900">{tache.prochaineEtape || "—"}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Balle chez</p>
        {tache.balleChez ? <StatusBadge value={tache.balleChez} /> : <p className="text-sm">—</p>}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Prochain point</p>
        <p className={`text-sm ${depasse ? "font-semibold text-red-600" : "text-slate-900"}`}>
          {formatDate(tache.prochainPoint)}
          {depasse && " · dépassé"}
        </p>
      </div>
      {incomplet && (
        <p className="text-sm text-amber-800 sm:col-span-3">
          Sujet ouvert incomplet : les trois champs de pilotage doivent être renseignés.
        </p>
      )}
    </div>
  );
}
