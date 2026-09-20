"use client";

import { useActionState, useState } from "react";
import { createSousProjetAction, type FormState } from "./actions";

const initialState: FormState = { status: "idle" };

export function NewSousProjetForm({ sites }: { sites: { id: string; nom: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createSousProjetAction, initialState);

  // Ferme le formulaire après un succès (motif « état dérivé pendant le rendu »).
  const [lastHandled, setLastHandled] = useState(state);
  if (state !== lastHandled) {
    setLastHandled(state);
    if (state.status === "success") setOpen(false);
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          + Nouveau sous-projet
        </button>
        {state.status === "success" && <span className="text-sm text-emerald-700">{state.message}</span>}
      </div>
    );
  }

  return (
    <form action={formAction} className="w-full space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-700">Nouveau sous-projet</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-slate-600">Nom du sous-projet</span>
          <input name="nom" required maxLength={120} className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Site</span>
          <select name="siteId" required defaultValue="" className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm">
            <option value="" disabled>
              Choisir un site…
            </option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Description (facultatif)</span>
        <textarea name="description" rows={2} className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-50">
          {pending ? "Création…" : "Créer le sous-projet"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500">
          Annuler
        </button>
        {state.status === "error" && <span className="text-sm text-red-600">{state.message}</span>}
      </div>
    </form>
  );
}
