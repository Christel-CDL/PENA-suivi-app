"use client";

import { useActionState, useState } from "react";
import { updatePrestataireAction, createPrestataireAction, type FormState } from "./actions";
import { ContactPicker } from "@/components/ContactPicker";
import { CONTACT_CATEGORIES } from "@/lib/airtable/constants";

const initialState: FormState = { status: "idle" };

type ContactOption = { id: string; label: string };

/**
 * Même design que Parties prenantes (puces + recherche pour en ajouter) :
 * une tâche peut avoir plusieurs prestataires, comme le permet le champ
 * Airtable (multipleRecordLinks). Seule différence : l'Admin peut aussi
 * créer un nouveau contact directement d'ici, tagué Prestataire.
 */
export function PrestataireField({
  tacheId,
  initial,
  prestataireAncienTexte,
  contacts,
  editable,
  isAdmin,
}: {
  tacheId: string;
  initial: ContactOption[];
  /** Ancienne valeur texte libre, affichée si aucun contact n'est encore lié. */
  prestataireAncienTexte: string;
  contacts: ContactOption[];
  editable: boolean;
  isAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(updatePrestataireAction, initialState);
  const [current, setCurrent] = useState<ContactOption[]>(initial);
  const [adding, setAdding] = useState(false);
  const [showNewPrestataire, setShowNewPrestataire] = useState(false);

  const changed = current.length !== initial.length || current.some((c, i) => c.id !== initial[i]?.id);

  if (!editable && current.length === 0 && !prestataireAncienTexte) return null;

  return (
    <div className="mt-1">
      <form action={formAction} className="text-sm text-slate-500">
        <input type="hidden" name="id" value={tacheId} />
        {current.map((c) => (
          <input key={c.id} type="hidden" name="prestataireContactIds" value={c.id} />
        ))}

        <div className="flex flex-wrap items-center gap-1.5">
          <span>Prestataire{current.length > 1 ? "s" : ""} :</span>
          {current.length === 0 && (
            <span className="text-slate-400">
              {prestataireAncienTexte ? `${prestataireAncienTexte} (ancienne valeur)` : "aucun"}
            </span>
          )}
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
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowNewPrestataire((v) => !v)}
              className="text-xs text-slate-500 underline hover:text-slate-900"
            >
              {showNewPrestataire ? "Annuler la création" : "+ Nouveau contact"}
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
              placeholder="Ajouter un prestataire…"
            />
          </div>
        )}
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
    <form action={formAction} className="mt-2 space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
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
          {pending ? "Création…" : "Créer et ajouter"}
        </button>
        {state.status === "error" && <span className="text-sm text-red-600">{state.message}</span>}
      </div>
    </form>
  );
}
