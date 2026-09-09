import { getCurrentUser } from "@/lib/auth/session";
import { loadDossier } from "@/lib/data/dossier";
import { listDemandes } from "@/lib/airtable/demandes";
import { listUtilisateurs } from "@/lib/airtable/users";
import { isAdmin } from "@/lib/auth/rbac";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { DemandeForm } from "./DemandeForm";
import { AccepterButton, RefuserButton } from "./DemandeActions";

export default async function DemandesPage() {
  const user = (await getCurrentUser())!;
  const admin = isAdmin(user);

  const [dossier, toutesDemandes, utilisateurs] = await Promise.all([
    loadDossier(user),
    listDemandes(),
    listUtilisateurs(),
  ]);

  const utilisateursById = new Map(utilisateurs.map((u) => [u.id, u]));
  const moi = utilisateurs.find((u) => u.email === user.email);
  const sitesById = new Map(dossier.sites.map((s) => [s.id, s]));

  const demandes = admin ? toutesDemandes : toutesDemandes.filter((d) => moi && d.demandeurIds.includes(moi.id));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Demandes de création</h1>

      {!admin && <DemandeForm sites={dossier.sites} sousProjets={dossier.sousProjets} />}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          {admin ? "Toutes les demandes" : "Mes demandes"}
        </h2>
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {demandes.length === 0 && <p className="p-4 text-sm text-slate-500">Aucune demande.</p>}
          {demandes.map((d) => {
            const demandeur = d.demandeurIds.map((id) => utilisateursById.get(id)?.nom).filter(Boolean).join(", ");
            const sites = d.siteIds.map((id) => sitesById.get(id)?.nom).filter(Boolean).join(", ");
            return (
              <div key={d.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{d.titrePropose}</p>
                  <StatusBadge value={d.statut} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {d.type} · {sites} {demandeur && `· Demandé par ${demandeur}`} · {formatDate(d.dateDemande)}
                </p>
                {d.description && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{d.description}</p>}
                {admin && d.statut === "En attente" && (
                  <div className="mt-3 flex gap-2">
                    <AccepterButton id={d.id} />
                    <RefuserButton id={d.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
