import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getTache } from "@/lib/airtable/taches";
import { loadDossier } from "@/lib/data/dossier";
import { canEditTask, canAccessSites, canEditJournalEntry, isAdmin } from "@/lib/auth/rbac";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { TaskEditForm } from "./TaskEditForm";
import { CommentForm } from "./CommentForm";
import { ResponsableField } from "./ResponsableField";
import { PartiesPrenantesField } from "./PartiesPrenantesField";
import { PrestataireField } from "./PrestataireField";
import { JournalEntryRow } from "@/app/(app)/journal/JournalEntryRow";

export default async function TacheDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await getCurrentUser())!;
  const { id } = await params;

  const tache = await getTache(id);
  if (!tache) notFound();

  const dossier = await loadDossier(user);
  const taskSiteIds = dossier.taskSiteIds.get(id) ?? [];
  if (!canAccessSites(user, taskSiteIds)) notFound(); // ne pas révéler l'existence d'une tâche hors périmètre

  const editable = canEditTask(user, tache);
  const admin = isAdmin(user);
  const contactsById = new Map(dossier.contacts.map((c) => [c.id, c]));
  const isNom = (n: string | undefined): n is string => Boolean(n);
  const responsables = tache.responsableContactIds.map((cid) => contactsById.get(cid)?.nom).filter(isNom);
  const prestataires = tache.prestataireContactIds.map((cid) => contactsById.get(cid)?.nom).filter(isNom);
  const historique = dossier.journal.filter((j) => j.tacheIds.includes(id));

  const toOption = (c: (typeof dossier.contacts)[number]) => ({
    id: c.id,
    label: c.organisation ? `${c.nom} (${c.organisation})` : c.nom,
  });
  // Le champ de recherche de chaque rôle ne propose que les contacts tagués
  // en conséquence (voir Catégorie sur la fiche contact) — sinon la liste
  // mélange prestataires, équipe PENA/CDL et interlocuteurs externes.
  const contactOptions = dossier.contacts.map(toOption).sort((a, b) => a.label.localeCompare(b.label));
  const equipeProjetOptions = dossier.contacts
    .filter((c) => c.categories.includes("Équipe projet"))
    .map(toOption)
    .sort((a, b) => a.label.localeCompare(b.label));
  // Une partie prenante peut être un prestataire, un membre de l'équipe
  // projet ou un tiers externe : on cherche parmi tout contact tagué, pas
  // seulement ceux tagués "Partie prenante" (sinon la liste est trop courte
  // pour être utile — vérifié avec Christel).
  const partiePrenanteOptions = dossier.contacts
    .filter((c) => c.categories.length > 0)
    .map(toOption)
    .sort((a, b) => a.label.localeCompare(b.label));
  const prestataireOptions = dossier.contacts
    .filter((c) => c.categories.includes("Prestataire"))
    .map(toOption)
    .sort((a, b) => a.label.localeCompare(b.label));

  const responsableActuel = contactOptions.find((c) => c.id === tache.responsableContactIds[0]);
  const partiesPrenantesActuelles = contactOptions.filter((c) => tache.partiesPrenantesIds.includes(c.id));
  const prestataireActuel = contactOptions.find((c) => c.id === tache.prestataireContactIds[0]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">{tache.nom}</h1>
          <StatusBadge value={tache.statut} />
          <StatusBadge value={tache.priorite} />
        </div>
        <ResponsableField
          key={`resp-${JSON.stringify(tache.responsableContactIds)}`}
          tacheId={tache.id}
          responsables={responsables}
          responsableActuel={responsableActuel}
          contacts={equipeProjetOptions}
          isAdmin={admin}
        />
        <PartiesPrenantesField
          key={`pp-${JSON.stringify(tache.partiesPrenantesIds)}`}
          tacheId={tache.id}
          initial={partiesPrenantesActuelles}
          contacts={partiePrenanteOptions}
          editable={editable}
        />
        <PrestataireField
          key={`prest-${JSON.stringify(tache.prestataireContactIds)}`}
          tacheId={tache.id}
          prestataires={prestataires}
          prestataireAncienTexte={tache.prestataireAncienTexte}
          prestataireActuel={prestataireActuel}
          contacts={prestataireOptions}
          editable={editable}
          isAdmin={admin}
        />
      </div>

      {editable ? (
        // key forcé sur les valeurs de la tâche : après un enregistrement réussi,
        // le formulaire (champs non contrôlés) doit se remonter pour refléter
        // les nouvelles valeurs au lieu de garder affichées celles du premier
        // rendu (sinon la modification semble "revenir" en arrière alors
        // qu'elle est bien enregistrée dans Airtable).
        <TaskEditForm key={JSON.stringify(tache)} tache={tache} />
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
            <JournalEntryRow key={j.id} entry={j} canEdit={canEditJournalEntry(user, j)} />
          ))}
        </div>
      </section>
    </div>
  );
}
