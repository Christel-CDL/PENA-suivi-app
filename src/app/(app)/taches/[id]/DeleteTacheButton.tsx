"use client";

import { useActionState, useState } from "react";
import { deleteTacheAction, type FormState } from "./actions";

const initialState: FormState = { status: "idle" };

/** Suppression en deux temps : un premier clic ouvre la confirmation, rien n'est supprimé avant le second. */
export function DeleteTacheButton({ tacheId, nom, nbJournal }: { tacheId: string; nom: string; nbJournal: number }) {
  const [confirmer, setConfirmer] = useState(false);
  const [state, formAction, pending] = useActionState(deleteTacheAction, initialState);

  if (!confirmer) {
    return (
      <button
        type="button"
        onClick={() => setConfirmer(true)}
        className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
      >
        Supprimer cette tâche
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
      <input type="hidden" name="id" value={tacheId} />
      <p className="text-red-900">
        Supprimer définitivement la tâche « <span className="font-medium">{nom}</span> » ? Cette action est
        irréversible.
        {nbJournal === 1 && " L'entrée de journal liée sera conservée, mais ne sera plus rattachée à aucune tâche."}
        {nbJournal > 1 &&
          ` Les ${nbJournal} entrées de journal liées seront conservées, mais ne seront plus rattachées à aucune tâche.`}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Suppression…" : "Oui, supprimer"}
        </button>
        <button type="button" onClick={() => setConfirmer(false)} className="text-slate-600 underline">
          Annuler
        </button>
        {state.status === "error" && <span className="text-red-700">{state.message}</span>}
      </div>
    </form>
  );
}
