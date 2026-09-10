"use client";

import { useActionState, useState } from "react";
import { updateResponsableAction, type FormState } from "./actions";
import { ContactPicker } from "@/components/ContactPicker";

const initialState: FormState = { status: "idle" };

type ContactOption = { id: string; label: string };

export function ResponsableField({
  tacheId,
  responsables,
  responsableActuel,
  contacts,
  isAdmin,
}: {
  tacheId: string;
  /** Noms affichés en lecture seule (peut rester vide). */
  responsables: string[];
  /** Contact actuellement assigné, pour préremplir le champ de recherche. */
  responsableActuel?: ContactOption;
  contacts: ContactOption[];
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateResponsableAction, initialState);

  if (!isAdmin) {
    return (
      <p className="mt-1 text-sm text-slate-500">
        {responsables.length > 0 ? `Responsable : ${responsables.join(", ")}` : "Aucun responsable assigné"}
      </p>
    );
  }

  if (!editing) {
    return (
      <p className="mt-1 text-sm text-slate-500">
        {responsables.length > 0 ? `Responsable : ${responsables.join(", ")}` : "Aucun responsable assigné"}{" "}
        <button onClick={() => setEditing(true)} className="text-slate-500 underline hover:text-slate-900">
          {responsables.length > 0 ? "Modifier" : "Assigner un responsable"}
        </button>
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={tacheId} />
      <div className="w-64">
        <ContactPicker name="responsableContactId" contacts={contacts} defaultValue={responsableActuel} placeholder="Rechercher un responsable…" />
      </div>
      <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
        {pending ? "…" : "Enregistrer"}
      </button>
      <button type="button" onClick={() => setEditing(false)} className="text-xs text-slate-500">
        Annuler
      </button>
      {state.status === "error" && <span className="text-xs text-red-600">{state.message}</span>}
    </form>
  );
}
