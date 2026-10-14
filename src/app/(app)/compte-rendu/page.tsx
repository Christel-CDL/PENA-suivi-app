import { getCurrentUser } from "@/lib/auth/session";
import { loadDossier } from "@/lib/data/dossier";
import { canEditTask } from "@/lib/auth/rbac";
import { estOuvert } from "@/lib/pilotage";
import { maintenantParisLocal } from "@/lib/format";
import { CompteRenduForm, type SujetOption } from "./CompteRenduForm";

export default async function CompteRenduPage({ searchParams }: { searchParams: Promise<{ tache?: string }> }) {
  const user = (await getCurrentUser())!;
  const { tache } = await searchParams;
  const dossier = await loadDossier(user);

  // Sujets proposés : les sujets ouverts du périmètre, plus celui d'où l'on
  // vient s'il est clos (pour pouvoir y consigner une dernière action).
  const sujets: SujetOption[] = dossier.taches
    .filter((t) => estOuvert(t.statut) || t.id === tache)
    .map((t) => ({
      id: t.id,
      nom: t.nom,
      voletId: t.sousProjetIds[0] ?? "",
      statut: t.statut,
      prochaineEtape: t.prochaineEtape,
      balleChez: t.balleChez,
      prochainPoint: t.prochainPoint,
      modifiable: canEditTask(user, t),
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom));

  const voletsAvecSujet = new Set(sujets.map((s) => s.voletId));
  // Volets dans le même ordre que la liste des sujets : veille en dernier.
  const volets = dossier.sousProjets
    .filter((sp) => voletsAvecSujet.has(sp.id))
    .sort((a, b) => Number(a.statut === "En attente") - Number(b.statut === "En attente") || a.nom.localeCompare(b.nom))
    .map((sp) => ({ id: sp.id, nom: sp.nom }));

  const contacts = dossier.contacts
    .map((c) => ({ id: c.id, label: c.organisation ? `${c.nom} (${c.organisation})` : c.nom }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const sujetInitial = sujets.find((s) => s.id === tache) ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Compte-rendu / action</h1>
        <p className="text-sm text-slate-500">
          Visite, réunion, appel… consignez-le directement dans le journal du sujet. Aucun fichier n&apos;est stocké : collez
          un lien OneDrive ou le lien du rapport de constat si besoin.
        </p>
      </div>
      <CompteRenduForm
        volets={volets}
        sujets={sujets}
        contacts={contacts}
        sujetInitialId={sujetInitial?.id ?? null}
        maintenant={maintenantParisLocal()}
      />
    </div>
  );
}
