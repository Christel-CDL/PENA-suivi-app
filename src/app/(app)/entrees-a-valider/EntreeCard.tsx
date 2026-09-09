"use client";

import { useActionState } from "react";
import { validerEntreeAction, rejeterEntreeAction, type FormState } from "./actions";
import type { EntreeAValider } from "@/lib/airtable/entrees-a-valider";
import { formatDateTime } from "@/lib/format";

const initialState: FormState = { status: "idle" };

type Tache = { id: string; nom: string };

export function EntreeCard({ entree, taches }: { entree: EntreeAValider; taches: Tache[] }) {
  const [state, formAction, pending] = useActionState(validerEntreeAction, initialState);
  const [rejetState, rejetAction, rejetPending] = useActionState(rejeterEntreeAction, initialState);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <span>
          De <span className="font-medium text-slate-700">{entree.expediteur}</span> · {formatDateTime(entree.dateEmail)}
        </span>
      </div>

      <form action={formAction} className="space-y-2">
        <input type="hidden" name="id" value={entree.id} />
        <input type="hidden" name="expediteur" value={entree.expediteur} />
        <textarea
          name="resume"
          defaultValue={entree.resumePropose}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Tâche associée</span>
          <select name="tacheId" defaultValue={entree.tacheSuggereeId ?? ""} className="w-full rounded-md border border-slate-300 px-3 py-1.5">
            <option value="">Aucune</option>
            {taches.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button type="submit" disabled={pending} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
            {pending ? "…" : "Valider et publier au journal"}
          </button>
          {state.status === "error" && <span className="text-xs text-red-600">{state.message}</span>}
        </div>
      </form>

      <form action={rejetAction}>
        <input type="hidden" name="id" value={entree.id} />
        <button type="submit" disabled={rejetPending} className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-50">
          {rejetPending ? "…" : "Rejeter"}
        </button>
        {rejetState.status === "error" && <span className="ml-2 text-xs text-red-600">{rejetState.message}</span>}
      </form>
    </div>
  );
}
