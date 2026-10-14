"use client";

import { useActionState, useState } from "react";
import { PilotageFields } from "@/components/PilotageFields";
import { accepterDemandeAction, refuserDemandeAction, type FormState } from "./actions";

const initialState: FormState = { status: "idle" };

export function AccepterButton({ id, nouvelleTache }: { id: string; nouvelleTache: boolean }) {
  const [state, formAction, pending] = useActionState(accepterDemandeAction, initialState);
  // Une nouvelle tâche naît ouverte (« À faire ») : ses trois champs de pilotage
  // sont demandés au moment de l'acceptation.
  const [ouvert, setOuvert] = useState(false);

  if (nouvelleTache && !ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white"
      >
        Accepter…
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className={nouvelleTache ? "w-full space-y-2 rounded-md border border-slate-200 p-3" : "inline-flex items-center gap-2"}
    >
      <input type="hidden" name="id" value={id} />
      {nouvelleTache && <PilotageFields />}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50">
          {pending ? "…" : nouvelleTache ? "Accepter et créer la tâche" : "Accepter"}
        </button>
        {nouvelleTache && (
          <button type="button" onClick={() => setOuvert(false)} className="text-xs text-slate-500">
            Annuler
          </button>
        )}
        {state.status === "error" && <span className="text-xs text-red-600">{state.message}</span>}
      </div>
    </form>
  );
}

export function RefuserButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(refuserDemandeAction, initialState);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 disabled:opacity-50">
        {pending ? "…" : "Refuser"}
      </button>
      {state.status === "error" && <span className="text-xs text-red-600">{state.message}</span>}
    </form>
  );
}
