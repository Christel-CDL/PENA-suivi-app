"use client";

import { useActionState } from "react";
import { updateTacheAction, type FormState } from "./actions";
import { TACHE_STATUTS, TACHE_PRIORITES } from "@/lib/airtable/constants";
import type { Tache } from "@/lib/airtable/taches";

const initialState: FormState = { status: "idle" };

export function TaskEditForm({ tache }: { tache: Tache }) {
  const [state, formAction, pending] = useActionState(updateTacheAction, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <input type="hidden" name="id" value={tache.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Statut</span>
          <select name="statut" defaultValue={tache.statut} className="w-full rounded-md border border-slate-300 px-3 py-1.5">
            {TACHE_STATUTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Priorité</span>
          <select name="priorite" defaultValue={tache.priorite} className="w-full rounded-md border border-slate-300 px-3 py-1.5">
            {TACHE_PRIORITES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-slate-600">Échéance</span>
          <input
            type="date"
            name="echeance"
            defaultValue={tache.echeance ?? ""}
            className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Description des objectifs</span>
        <textarea
          name="description"
          defaultValue={tache.description}
          rows={4}
          className="w-full rounded-md border border-slate-300 px-3 py-1.5"
        />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-50">
          {pending ? "Enregistrement…" : "Enregistrer"}
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
