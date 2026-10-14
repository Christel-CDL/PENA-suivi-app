"use client";

import { startTransition, useActionState, useState } from "react";
import { validerEntreeAction, rejeterEntreeAction, type FormState } from "./actions";
import type { EntreeAValider } from "@/lib/airtable/entrees-a-valider";
import { formatDateTime } from "@/lib/format";
import { TachePicker, type PickerData } from "@/components/TachePicker";
import { SousProjetSelect } from "@/components/SousProjetSelect";
import { PilotageFields } from "@/components/PilotageFields";
import { StatusBadge } from "@/components/StatusBadge";
import { TACHE_STATUTS } from "@/lib/airtable/constants";

const initialState: FormState = { status: "idle" };
const CHAMP = "w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm";

export function EntreeCard({ entree, picker }: { entree: EntreeAValider; picker: PickerData }) {
  const [state, formAction, pending] = useActionState(validerEntreeAction, initialState);
  const [rejetState, rejetAction, rejetPending] = useActionState(rejeterEntreeAction, initialState);
  const [mode, setMode] = useState<"existante" | "nouvelle">("existante");
  const [tacheId, setTacheId] = useState<string | null>(entree.tacheSuggereeId);
  const [majSujet, setMajSujet] = useState(false);

  const sujet = picker.taches.find((t) => t.id === tacheId);

  const sousProjetsGroupes = picker.sousProjets.map((sp) => ({
    id: sp.id,
    nom: sp.nom,
    siteNom: picker.sites.find((s) => s.id === sp.siteId)?.nom ?? "Sans site",
  }));

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <span>
          De <span className="font-medium text-slate-700">{entree.expediteur || "—"}</span> ·{" "}
          {formatDateTime(entree.dateEmail)}
        </span>
        <span className="flex items-center gap-2">
          {entree.origine !== "Email" && <StatusBadge value={entree.origine} />}
          {/^https?:\/\//.test(entree.lienDocument) && (
            <a href={entree.lienDocument} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-900">
              Document source
            </a>
          )}
        </span>
      </div>

      {entree.actionsDemandees && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Actions demandées dans la source (à traiter vous-même, rien n&apos;est envoyé) :</p>
          <p className="whitespace-pre-wrap">{entree.actionsDemandees}</p>
        </div>
      )}

      <form
        // onSubmit plutôt qu'action={…} : en cas d'erreur, React ne vide pas le résumé corrigé.
        onSubmit={(e) => {
          e.preventDefault();
          const donnees = new FormData(e.currentTarget);
          startTransition(() => formAction(donnees));
        }}
        className="space-y-3"
      >
        <input type="hidden" name="id" value={entree.id} />
        <input type="hidden" name="modeTache" value={mode} />
        <textarea name="resume" defaultValue={entree.resumePropose} rows={3} className={CHAMP} />

        <div className="text-sm">
          <span className="mb-1 block text-slate-600">Sujet concerné</span>

          {mode === "existante" ? (
            <>
              <TachePicker
                name="tacheId"
                data={picker}
                defaultId={entree.tacheSuggereeId}
                onChange={(id) => {
                  setTacheId(id);
                  setMajSujet(false);
                }}
              />

              {sujet?.pilotage && (
                <div className="mt-3 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <label className="flex items-center gap-2 font-medium text-slate-700">
                    <input
                      type="checkbox"
                      name="majSujet"
                      value="1"
                      checked={majSujet}
                      onChange={(e) => setMajSujet(e.target.checked)}
                    />
                    Mettre à jour le sujet en même temps
                  </label>
                  {majSujet && (
                    // key : prérempli avec les valeurs du sujet choisi, remonté si on en change.
                    <div key={sujet.id} className="space-y-3">
                      <PilotageFields valeurs={sujet.pilotage} requis={false} />
                      <label className="block sm:w-1/3">
                        <span className="mb-1 block text-slate-600">Statut</span>
                        <select name="statut" defaultValue={sujet.pilotage.statut} className={CHAMP}>
                          {TACHE_STATUTS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setMode("nouvelle")}
                className="mt-2 text-xs text-slate-400 underline hover:text-slate-700"
              >
                Aucun sujet existant ne convient ? Créer un nouveau sujet
              </button>
            </>
          ) : (
            <div className="space-y-2 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  name="nouvelleTacheNom"
                  required
                  placeholder="Nom du nouveau sujet"
                  className={`${CHAMP} sm:col-span-2`}
                />
                <SousProjetSelect name="nouvelleTacheSousProjetId" sousProjets={sousProjetsGroupes} />
                <p className="self-center text-xs text-slate-500">
                  Créé à la validation (priorité Normale, statut « À faire ») ; responsable et échéance se complètent
                  ensuite sur sa fiche.
                </p>
              </div>
              <PilotageFields />
              <button
                type="button"
                onClick={() => setMode("existante")}
                className="text-xs text-slate-500 underline hover:text-slate-900"
              >
                Revenir au choix d&apos;un sujet existant
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button type="submit" disabled={pending} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
            {pending ? "…" : "Valider et publier au journal"}
          </button>
          {state.status === "error" && (
            <span role="alert" className="text-xs text-red-600">
              {state.message}
            </span>
          )}
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
