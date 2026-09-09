import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getTache } from "@/lib/airtable/taches";
import { loadDossier } from "@/lib/data/dossier";
import { canEditTask, canAccessSites } from "@/lib/auth/rbac";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatDateTime } from "@/lib/format";
import { TaskEditForm } from "./TaskEditForm";
import { CommentForm } from "./CommentForm";

export default async function TacheDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await getCurrentUser())!;
  const { id } = await params;

  const tache = await getTache(id);
  if (!tache) notFound();

  const dossier = await loadDossier(user);
  const taskSiteIds = dossier.taskSiteIds.get(id) ?? [];
  if (!canAccessSites(user, taskSiteIds)) notFound(); // ne pas révéler l'existence d'une tâche hors périmètre

  const editable = canEditTask(user, tache);
  const contactsById = new Map(dossier.contacts.map((c) => [c.id, c]));
  const responsables = tache.responsableContactIds.map((cid) => contactsById.get(cid)?.nom).filter(Boolean);
  const historique = dossier.journal.filter((j) => j.tacheIds.includes(id));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">{tache.nom}</h1>
          <StatusBadge value={tache.statut} />
          <StatusBadge value={tache.priorite} />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {responsables.length > 0 ? `Responsable : ${responsables.join(", ")}` : "Aucun responsable assigné"}
          {tache.prestataire ? ` · Prestataire : ${tache.prestataire}` : ""}
        </p>
      </div>

      {editable ? (
        <TaskEditForm tache={tache} />
      ) : (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p className="text-slate-500">
            Lecture seule — seul le responsable de cette tâche (ou l&apos;administrateur) peut la modifier.
          </p>
          <p>
            <span className="text-slate-500">Échéance : </span>
            {formatDate(tache.echeance)}
          </p>
          <p className="whitespace-pre-wrap">{tache.description || "Aucune description."}</p>
        </div>
      )}

      <CommentForm tacheId={tache.id} />

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Historique du journal</h2>
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {historique.length === 0 && <p className="p-4 text-sm text-slate-500">Aucune entrée liée à cette tâche.</p>}
          {historique.map((j) => (
            <div key={j.id} className="p-3 text-sm">
              <p className="whitespace-pre-wrap text-slate-800">{j.description}</p>
              <p className="mt-1 text-xs text-slate-400">
                {formatDateTime(j.date)} · {j.origine}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
