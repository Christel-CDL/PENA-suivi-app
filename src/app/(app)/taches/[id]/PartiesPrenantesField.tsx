"use client";

import { useActionState, useState } from "react";
import { updatePartiesPrenantesAction, type FormState } from "./actions";
import { ContactPicker } from "@/components/ContactPicker";

const initialState: FormState = { status: "idle" };

type ContactOption = { id: string; label: string };

export function PartiesPrenantesField({
  tacheId,
  initial,
  contacts,
  editable,
}: {
  tacheId: string;
  initial: ContactOption[];
  contacts: ContactOption[];
  editable: boolean;
}) {
  const [state, formAction, pending] = useActionState(updatePartiesPrenantesAction, initialState);
  const [current, setCurrent] = useState<ContactOption[]>(initial);
  const [adding, setAdding] = useState(false);

  const changed = current.length !== initial.length || current.some((c, i) => c.id !== initial[i]?.id);

  if (!editable && current.length === 0) return null;

  return (
    <form action={formAction} className="mt-1 text-sm text-slate-500">
      <input type="hidden" name="id" value={tacheId} />
      {current.map((c) => (
        <input key={c.id} type="hidden" name="partiesPrenantesIds" value={c.id} />
      ))}

      <div className="flex flex-wrap items-center gap-1.5">
        <span>Parties prenantes :</span>
        {current.length === 0 && <span className="text-slate-400">aucune</span>}
        {current.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
            {c.label}
            {editable && (
              <button
                type="button"
                onClick={() => setCurrent((list) => list.filter((x) => x.id !== c.id))}
                className="text-slate-400 hover:text-slate-700"
                aria-label={`Retirer ${c.label}`}
              >
                ✕
              </button>
            )}
          </span>
        ))}
        {editable && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="text-xs text-slate-500 underline hover:text-slate-900">
            + Ajouter
          </button>
        )}
        {editable && changed && (
          <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">
            {pending ? "…" : "Enregistrer"}
          </button>
        )}
        {state.status === "error" && <span className="text-xs text-red-600">{state.message}</span>}
      </div>

      {editable && adding && (
        <div className="mt-2 w-64">
          <ContactPicker
            contacts={contacts}
            excludeIds={current.map((c) => c.id)}
            onPick={(c) => {
              setCurrent((list) => [...list, c]);
              setAdding(false);
            }}
            placeholder="Ajouter une partie prenante…"
          />
        </div>
      )}
    </form>
  );
}
