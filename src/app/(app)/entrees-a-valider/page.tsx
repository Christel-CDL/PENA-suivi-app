import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/rbac";
import { listEntreesAValider } from "@/lib/airtable/entrees-a-valider";
import { listTaches } from "@/lib/airtable/taches";
import { EntreeCard } from "./EntreeCard";

export default async function EntreesAValiderPage() {
  const user = (await getCurrentUser())!;
  if (!isAdmin(user)) redirect("/");

  const [entrees, taches] = await Promise.all([listEntreesAValider(), listTaches()]);
  const enAttente = entrees.filter((e) => e.statut === "À valider");

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
          <EntreeCard key={e.id} entree={e} taches={taches.map((t) => ({ id: t.id, nom: t.nom }))} />
        ))}
      </div>
    </div>
  );
}
