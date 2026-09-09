"use client";

import { useActionState, useState } from "react";
import { submitDemandeAction, type FormState } from "./actions";
import { DEMANDE_TYPES } from "@/lib/airtable/constants";

const initialState: FormState = { status: "idle" };

type Site = { id: string; nom: string };
type SousProjet = { id: string; nom: string; projetIds: string[] };

export function DemandeForm({ sites, sousProjets }: { sites: Site[]; sousProjets: SousProjet[] }) {
  const [state, formAction, pending] = useActionState(submitDemandeAction, initialState);
  const [type, setType] = useState<string>(DEMANDE_TYPES[0]);
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? "");

  const sousProjetsDuSite = sousProjets.filter((sp) => sp.projetIds.includes(siteId));

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">
        Votre demande sera transmise à l&apos;administratrice. Le sous-projet ou la tâche n&apos;est créé qu&apos;après acceptation.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Type de demande</span>
          <select name="type" value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-1.5">
            {DEMANDE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Site concerné</span>
          <select
            name="siteIds"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
      </div>

      {type === "Nouvelle tâche" && (
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Sous-projet parent</span>
          <select name="sousProjetParentIds" className="w-full rounded-md border border-slate-300 px-3 py-1.5" required>
            {sousProjetsDuSite.length === 0 && <option value="">Aucun sous-projet sur ce site</option>}
            {sousProjetsDuSite.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.nom}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Titre proposé</span>
        <input name="titre" required className="w-full rounded-md border border-slate-300 px-3 py-1.5" />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Description / justification</span>
        <textarea name="description" rows={3} className="w-full rounded-md border border-slate-300 px-3 py-1.5" />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-50">
          {pending ? "Envoi…" : "Envoyer la demande"}
        </button>
        {state.status !== "idle" && (
          <span className={`text-sm ${state.status === "error" ? "text-red-600" : "text-emerald-700"}`}>{state.message}</span>
        )}
      </div>
    </form>
  );
}
