"use client";

import { useActionState } from "react";
import { addJournalEntryAction, type FormState } from "./actions";

const initialState: FormState = { status: "idle" };

export function JournalForm() {
  const [state, formAction, pending] = useActionState(addJournalEntryAction, initialState);

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Nouvelle entrée de journal</span>
        <textarea
          name="description"
          rows={3}
          required
          placeholder="Résumé factuel de l'action. La tâche concernée est détectée automatiquement à partir des mots-clés."
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-50">
          {pending ? "Envoi…" : "Ajouter"}
        </button>
        {state.status !== "idle" && (
          <span className={`text-sm ${state.status === "error" ? "text-red-600" : "text-emerald-700"}`}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
