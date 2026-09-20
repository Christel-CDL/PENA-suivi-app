import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/rbac";
import { loadDossier } from "@/lib/data/dossier";
import { listEntreesAValider } from "@/lib/airtable/entrees-a-valider";
import type { PickerData } from "@/components/TachePicker";
import { EntreeCard } from "./EntreeCard";

export default async function EntreesAValiderPage() {
  const user = (await getCurrentUser())!;
  if (!isAdmin(user)) redirect("/");

  const [entrees, dossier] = await Promise.all([listEntreesAValider(), loadDossier(user)]);
  const enAttente = entrees.filter((e) => e.statut === "À valider");

  // Chaque tâche est présentée avec son sous-projet et son site, pour pouvoir la
  // retrouver par mots-clés ou en filtrant, plutôt que dans une liste plate de noms.
  const sitesById = new Map(dossier.sites.map((s) => [s.id, s.nom]));
  const sousProjetsById = new Map(dossier.sousProjets.map((sp) => [sp.id, sp]));

  const suggerees = new Set(enAttente.map((e) => e.tacheSuggereeId).filter((id): id is string => Boolean(id)));

  const picker: PickerData = {
    sites: dossier.sites.map((s) => ({ id: s.id, nom: s.nom })),
    sousProjets: dossier.sousProjets.map((sp) => ({ id: sp.id, nom: sp.nom, siteId: sp.projetIds[0] ?? null })),
    // Les tâches terminées ou annulées ne sont plus proposées (sauf si une entrée
    // en attente les avait déjà suggérées, pour ne pas les faire disparaître).
    taches: dossier.taches
      .filter((t) => (t.statut !== "Terminé" && t.statut !== "Annulée") || suggerees.has(t.id))
      .map((t) => {
      const sp = sousProjetsById.get(t.sousProjetIds[0]);
      const siteId = sp?.projetIds[0] ?? null;
      return {
        id: t.id,
        nom: t.nom,
        sousProjetId: sp?.id ?? null,
        sousProjetNom: sp?.nom ?? "",
        siteId,
        siteNom: (siteId && sitesById.get(siteId)) || "",
      };
    }),
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Entrées à valider</h1>
        <p className="text-sm text-slate-500">
          Résumés d&apos;e-mails générés automatiquement par le workflow n8n. Rien n&apos;apparaît dans le journal tant
          que vous ne validez pas l&apos;entrée ci-dessous (vous pouvez corriger le texte avant publication).
        </p>
      </div>

      <div className="space-y-3">
        {enAttente.length === 0 && <p className="text-sm text-slate-500">Rien à valider pour le moment.</p>}
        {enAttente.map((e) => (
          <EntreeCard key={e.id} entree={e} picker={picker} />
        ))}
      </div>
    </div>
  );
}
