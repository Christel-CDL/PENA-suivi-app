"use client";

import { useActionState, useState } from "react";
import { createContactFromTacheAction, type FormState } from "./actions";
import { CONTACT_CATEGORIES } from "@/lib/airtable/constants";

const initialState: FormState = { status: "idle" };

/**
 * Création de contact commune aux trois champs Responsable / Parties
 * prenantes / Prestataires : le contact créé devient simplement cherchable
 * dans les trois (selon la catégorie cochée) — pas d'assignation directe à
 * un champ en particulier, on l'ajoute ensuite via son propre "+ Ajouter".
 */
export function NewContactField({ tacheId }: { tacheId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createContactFromTacheAction, initialState);

  const [lastHandled, setLastHandled] = useState(state);
  if (state !== lastHandled) {
    setLastHandled(state);
    if (state.status === "success") setOpen(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-1 text-xs text-slate-500 underline hover:text-slate-900">
        + Nouveau contact
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
      <input type="hidden" name="id" value={tacheId} />
      <p className="text-sm font-medium text-slate-700">Nouveau contact</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="nom" required placeholder="Nom" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
        <input name="organisation" placeholder="Organisation" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
        <input name="fonction" placeholder="Fonction" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
        <input name="email" type="email" placeholder="E-mail" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
        <input name="telephone" placeholder="Téléphone" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-slate-500">Catégorie :</span>
        {CONTACT_CATEGORIES.map((cat) => (
          <label key={cat} className="flex items-center gap-1.5">
            <input type="checkbox" name="categories" value={cat} />
            {cat}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {pending ? "Création…" : "Créer le contact"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500">
          Annuler
        </button>
        {state.status === "error" && <span className="text-sm text-red-600">{state.message}</span>}
      </div>
    </form>
  );
}
