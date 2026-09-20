"use client";

import { useActionState, useState } from "react";
import { createTacheAction, type FormState } from "./actions";
import { TACHE_PRIORITES } from "@/lib/airtable/constants";
import { ContactPicker } from "@/components/ContactPicker";
import { SousProjetSelect, type SousProjetGroupe } from "@/components/SousProjetSelect";

const initialState: FormState = { status: "idle" };

type SousProjet = SousProjetGroupe;
type ContactOption = { id: string; label: string };

export function NewTacheForm({
  sousProjets,
  equipeProjetOptions,
}: {
  sousProjets: SousProjet[];
  equipeProjetOptions: ContactOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createTacheAction, initialState);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
        + Nouvelle tâche
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-slate-600">Nom de la tâche</span>
          <input name="nom" required className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Sous-projet</span>
          <SousProjetSelect name="sousProjetId" sousProjets={sousProjets} />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Priorité</span>
          <select name="priorite" defaultValue="Normale" className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm">
            {TACHE_PRIORITES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Échéance (facultatif)</span>
          <input type="date" name="echeance" className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
        </label>

        <div className="text-sm">
          <span className="mb-1 block text-slate-600">Responsable (facultatif)</span>
          <ContactPicker name="responsableContactId" contacts={equipeProjetOptions} placeholder="Rechercher un responsable…" />
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Description des objectifs (facultatif)</span>
        <textarea name="description" rows={3} className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-50">
          {pending ? "Création…" : "Créer la tâche"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500">
          Annuler
        </button>
        {state.status === "error" && <span className="text-sm text-red-600">{state.message}</span>}
      </div>
    </form>
  );
}
