"use client";

import { useActionState, useState } from "react";
import { validerEntreeAction, rejeterEntreeAction, type FormState } from "./actions";
import type { EntreeAValider } from "@/lib/airtable/entrees-a-valider";
import { formatDateTime } from "@/lib/format";
import { TachePicker, type PickerData } from "@/components/TachePicker";
import { SousProjetSelect } from "@/components/SousProjetSelect";

const initialState: FormState = { status: "idle" };

export function EntreeCard({ entree, picker }: { entree: EntreeAValider; picker: PickerData }) {
  const [state, formAction, pending] = useActionState(validerEntreeAction, initialState);
  const [rejetState, rejetAction, rejetPending] = useActionState(rejeterEntreeAction, initialState);
  const [mode, setMode] = useState<"existante" | "nouvelle">("existante");

  const sousProjetsGroupes = picker.sousProjets.map((sp) => ({
    id: sp.id,
    nom: sp.nom,
    siteNom: picker.sites.find((s) => s.id === sp.siteId)?.nom ?? "Sans site",
  }));

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <span>
          De <span className="font-medium text-slate-700">{entree.expediteur}</span> · {formatDateTime(entree.dateEmail)}
        </span>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={entree.id} />
        <input type="hidden" name="expediteur" value={entree.expediteur} />
        <input type="hidden" name="modeTache" value={mode} />
        <textarea
          name="resume"
          defaultValue={entree.resumePropose}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />

        <div className="text-sm">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-slate-600">Tâche associée</span>
            <button
              type="button"
              onClick={() => setMode(mode === "existante" ? "nouvelle" : "existante")}
              className="text-xs text-slate-500 underline hover:text-slate-900"
            >
              {mode === "existante" ? "+ Créer une nouvelle tâche" : "Choisir une tâche existante"}
            </button>
          </div>

          {mode === "existante" ? (
            <TachePicker name="tacheId" data={picker} defaultId={entree.tacheSuggereeId} />
          ) : (
            <div className="grid gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 sm:grid-cols-2">
              <input
                name="nouvelleTacheNom"
                required
                placeholder="Nom de la nouvelle tâche"
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm sm:col-span-2"
              />
              <SousProjetSelect name="nouvelleTacheSousProjetId" sousProjets={sousProjetsGroupes} />
              <p className="self-center text-xs text-slate-500">
                Créée à la validation (priorité Normale, statut « À faire ») ; responsable et échéance se complètent
                ensuite sur sa fiche.
              </p>
            </div>
          )}
        </div>

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
