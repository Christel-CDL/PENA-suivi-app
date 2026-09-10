"use client";

import { useActionState, useState } from "react";
import { updateTacheAction, createPrestataireAction, type FormState } from "./actions";
import { TACHE_STATUTS, TACHE_PRIORITES } from "@/lib/airtable/constants";
import type { Tache } from "@/lib/airtable/taches";
import type { Contact } from "@/lib/airtable/contacts";

const initialState: FormState = { status: "idle" };

export function TaskEditForm({
  tache,
  contacts,
  isAdmin,
}: {
  tache: Tache;
  contacts: Contact[];
  isAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateTacheAction, initialState);
  const [showNewPrestataire, setShowNewPrestataire] = useState(false);
  const contactsTries = [...contacts].sort((a, b) => a.nom.localeCompare(b.nom));

  return (
    <div className="space-y-3">
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

          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Échéance</span>
            <input
              type="date"
              name="echeance"
              defaultValue={tache.echeance ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Prestataire</span>
            <select
              name="prestataireContactId"
              defaultValue={tache.prestataireContactIds[0] ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5"
            >
              <option value="">Aucun</option>
              {contactsTries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                  {c.organisation ? ` (${c.organisation})` : ""}
                </option>
              ))}
            </select>
            {tache.prestataireContactIds.length === 0 && tache.prestataireAncienTexte && (
              <p className="mt-1 text-xs text-slate-400">
                Ancienne valeur non liée à un contact : {tache.prestataireAncienTexte}
              </p>
            )}
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setShowNewPrestataire((v) => !v)}
                className="mt-1 text-xs text-slate-500 underline hover:text-slate-900"
              >
                {showNewPrestataire ? "Annuler" : "+ Nouveau prestataire"}
              </button>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                Le prestataire recherché n&apos;existe pas ? Seul l&apos;administrateur peut en créer un.
              </p>
            )}
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

      {isAdmin && showNewPrestataire && <NewPrestataireForm tacheId={tache.id} />}
    </div>
  );
}

function NewPrestataireForm({ tacheId }: { tacheId: string }) {
  const [state, formAction, pending] = useActionState(createPrestataireAction, initialState);

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
      <input type="hidden" name="id" value={tacheId} />
      <p className="text-sm text-slate-600">Nouveau contact prestataire</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="nom" required placeholder="Nom" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
        <input name="organisation" placeholder="Organisation" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
          {pending ? "Création…" : "Créer et assigner"}
        </button>
        {state.status === "error" && <span className="text-xs text-red-600">{state.message}</span>}
      </div>
    </form>
  );
}
