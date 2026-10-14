import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { canUseConnector } from "@/lib/auth/rbac";
import { lireClient, redirectionAutorisee, urlApp } from "@/lib/auth/oauth";
import { repondreAutorisation } from "./actions";

type Params = {
  client_id?: string;
  redirect_uri?: string;
  response_type?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
};

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6">{children}</div>
    </main>
  );
}

/** Page de consentement OAuth du connecteur MCP « Suivi PENA » (Claude). */
export default async function AutorisationPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;

  const client = p.client_id ? await lireClient(p.client_id) : null;
  const valide =
    client &&
    p.redirect_uri &&
    client.redirectUris.includes(p.redirect_uri) &&
    redirectionAutorisee(p.redirect_uri) &&
    p.response_type === "code" &&
    p.code_challenge_method === "S256" &&
    p.code_challenge;
  if (!valide) {
    return (
      <Cadre>
        <h1 className="text-lg font-semibold text-slate-900">Demande de connexion invalide</h1>
        <p className="text-sm text-slate-600">Relancez la connexion du connecteur depuis Claude.</p>
      </Cadre>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    // Après le lien magique, retour ici avec les mêmes paramètres.
    const suite = `/oauth/authorize?${new URLSearchParams(p as Record<string, string>).toString()}`;
    redirect(`${urlApp()}/login?suite=${encodeURIComponent(suite)}`);
  }

  if (!canUseConnector(user)) {
    return (
      <Cadre>
        <h1 className="text-lg font-semibold text-slate-900">Connecteur non disponible</h1>
        <p className="text-sm text-slate-600">
          Le connecteur Claude « Suivi PENA » n&apos;est pas encore ouvert à votre compte. Rapprochez-vous de
          l&apos;administratrice.
        </p>
      </Cadre>
    );
  }

  const champs = (
    <>
      <input type="hidden" name="client_id" value={p.client_id} />
      <input type="hidden" name="redirect_uri" value={p.redirect_uri} />
      <input type="hidden" name="state" value={p.state ?? ""} />
      <input type="hidden" name="code_challenge" value={p.code_challenge} />
    </>
  );

  return (
    <Cadre>
      <h1 className="text-lg font-semibold text-slate-900">Autoriser {client.nom} ?</h1>
      <p className="text-sm text-slate-600">
        <strong>{client.nom}</strong> demande à consulter le suivi ICPE PENA <strong>en votre nom</strong> ({user.nom}) :
        vues de pilotage, sujets, volets et journal, avec exactement vos droits. Il pourra aussi ajouter un
        compte-rendu au journal et mettre à jour le pilotage d&apos;un sujet, toujours après vous avoir demandé
        confirmation, et avec les mêmes contrôles que l&apos;application.
      </p>
      <p className="text-xs text-slate-500">
        Ce que Claude lit apparaîtra dans vos conversations. Vous pourrez retirer l&apos;accès à tout moment en
        supprimant le connecteur dans les paramètres de Claude.
      </p>
      <div className="flex gap-3">
        <form action={repondreAutorisation}>
          {champs}
          <button
            type="submit"
            name="decision"
            value="autoriser"
            className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Autoriser
          </button>
        </form>
        <form action={repondreAutorisation}>
          {champs}
          <button
            type="submit"
            name="decision"
            value="refuser"
            className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Refuser
          </button>
        </form>
      </div>
    </Cadre>
  );
}
