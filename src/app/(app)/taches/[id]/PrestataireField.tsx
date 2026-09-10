"use client";

import { useActionState, useState } from "react";
import { updatePrestataireAction, createPrestataireAction, type FormState } from "./actions";
import { ContactPicker } from "@/components/ContactPicker";
import { CONTACT_CATEGORIES } from "@/lib/airtable/constants";

const initialState: FormState = { status: "idle" };

type ContactOption = { id: string; label: string };

export function PrestataireField({
  tacheId,
  prestataires,
  prestataireAncienTexte,
  prestataireActuel,
  contacts,
  editable,
  isAdmin,
}: {
  tacheId: string;
  /** Noms affichés en lecture seule (peut rester vide). */
  prestataires: string[];
  /** Ancienne valeur texte libre, affichée si aucun contact n'est encore lié. */
  prestataireAncienTexte: string;
  /** Contact actuellement assigné, pour préremplir le champ de recherche. */
  prestataireActuel?: ContactOption;
  contacts: ContactOption[];
  editable: boolean;
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updatePrestataireAction, initialState);
  const [showNewPrestataire, setShowNewPrestataire] = useState(false);

  const label =
    prestataires.length > 0
      ? `Prestataire : ${prestataires.join(", ")}`
      : prestataireAncienTexte
        ? `Prestataire (ancienne valeur) : ${prestataireAncienTexte}`
        : "Aucun prestataire assigné";

  if (!editable) {
    return <p className="mt-1 text-sm text-slate-500">{label}</p>;
  }

  if (!editing) {
    return (
      <p className="mt-1 text-sm text-slate-500">
        {label}{" "}
        <button onClick={() => setEditing(true)} className="text-slate-500 underline hover:text-slate-900">
          {prestataires.length > 0 ? "Modifier" : "Assigner un prestataire"}
        </button>
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={tacheId} />
        <div className="w-64">
          <ContactPicker
            name="prestataireContactId"
            contacts={contacts}
            defaultValue={prestataireActuel}
            placeholder="Rechercher un contact…"
          />
        </div>
        <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
          {pending ? "…" : "Enregistrer"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-slate-500">
          Annuler
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowNewPrestataire((v) => !v)}
            className="text-xs text-slate-500 underline hover:text-slate-900"
          >
            {showNewPrestataire ? "Annuler la création" : "+ Nouveau prestataire"}
          </button>
        )}
        {state.status === "error" && <span className="text-xs text-red-600">{state.message}</span>}
      </form>

      {isAdmin && showNewPrestataire && (
        <NewPrestataireForm tacheId={tacheId} onDone={() => setShowNewPrestataire(false)} />
      )}
    </div>
  );
}

function NewPrestataireForm({ tacheId, onDone }: { tacheId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(createPrestataireAction, initialState);

  // Ferme le bloc dès que la création réussit, sans passer par un effet
  // (pattern "ajuster un état pendant le rendu" recommandé par React).
  const [lastHandled, setLastHandled] = useState(state);
  if (state !== lastHandled) {
    setLastHandled(state);
    if (state.status === "success") onDone();
  }

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
      <input type="hidden" name="id" value={tacheId} />
      <p className="text-sm font-medium text-slate-700">Nouveau contact prestataire</p>
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
            <input type="checkbox" name="categories" value={cat} defaultChecked={cat === "Prestataire"} />
            {cat}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {pending ? "Création…" : "Créer et assigner"}
        </button>
        {state.status === "error" && <span className="text-sm text-red-600">{state.message}</span>}
      </div>
    </form>
  );
}
