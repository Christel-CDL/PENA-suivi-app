"use client";

import { useActionState, useState } from "react";
import { createContactAction, updateContactAction, type FormState } from "./actions";
import { CONTACT_CATEGORIES } from "@/lib/airtable/constants";
import type { Contact } from "@/lib/airtable/contacts";

const initialState: FormState = { status: "idle" };

type Site = { id: string; nom: string };

function Fields({ contact, sites }: { contact?: Contact; sites: Site[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <input name="nom" defaultValue={contact?.nom} required placeholder="Nom" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
      <input name="organisation" defaultValue={contact?.organisation} placeholder="Organisation" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
      <input name="fonction" defaultValue={contact?.fonction} placeholder="Fonction" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
      <input name="email" type="email" defaultValue={contact?.email} placeholder="E-mail" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
      <input name="telephone" defaultValue={contact?.telephone} placeholder="Téléphone" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
      <select name="projetIds" multiple defaultValue={contact?.projetIds} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
        {sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nom}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap items-center gap-3 text-sm sm:col-span-2">
        <span className="text-slate-500">Catégorie :</span>
        {CONTACT_CATEGORIES.map((cat) => (
          <label key={cat} className="flex items-center gap-1.5">
            <input type="checkbox" name="categories" value={cat} defaultChecked={contact?.categories.includes(cat)} />
            {cat}
          </label>
        ))}
      </div>
    </div>
  );
}

export function NewContactForm({ sites }: { sites: Site[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createContactAction, initialState);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
        + Ajouter un contact
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
      <Fields sites={sites} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-50">
          {pending ? "Ajout…" : "Ajouter"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500">
          Annuler
        </button>
        {state.status !== "idle" && (
          <span className={`text-sm ${state.status === "error" ? "text-red-600" : "text-emerald-700"}`}>{state.message}</span>
        )}
      </div>
    </form>
  );
}

export function EditContactForm({ contact, sites, onDone }: { contact: Contact; sites: Site[]; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(updateContactAction, initialState);

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <input type="hidden" name="id" value={contact.id} />
      <Fields contact={contact} sites={sites} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-50">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" onClick={onDone} className="text-sm text-slate-500">
          Fermer
        </button>
        {state.status !== "idle" && (
          <span className={`text-sm ${state.status === "error" ? "text-red-600" : "text-emerald-700"}`}>{state.message}</span>
        )}
      </div>
    </form>
  );
}
