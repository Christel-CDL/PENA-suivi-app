"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { updateJournalEntryAction, deleteJournalEntryAction, type FormState } from "./actions";
import { formatDateTime } from "@/lib/format";
import type { JournalEntry } from "@/lib/airtable/journal";

const initialState: FormState = { status: "idle" };

export function JournalEntryRow({
  entry,
  tache,
  canEdit,
}: {
  entry: JournalEntry;
  tache?: { id: string; nom: string };
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(updateJournalEntryAction, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteJournalEntryAction, initialState);

  // useActionState ne referme pas le formulaire tout seul : sans ça,
  // l'enregistrement réussi donne l'impression de n'avoir rien fait. On
  // détecte le passage à "success" pendant le rendu (pattern recommandé par
  // React pour ajuster un état suite à un changement, plutôt qu'un effet).
  const [lastHandledUpdate, setLastHandledUpdate] = useState(updateState);
  if (updateState !== lastHandledUpdate) {
    setLastHandledUpdate(updateState);
    if (updateState.status === "success" && editing) setEditing(false);
  }

  if (editing) {
    return (
      <form action={updateAction} className="space-y-2 p-4 text-sm">
        <input type="hidden" name="id" value={entry.id} />
        <textarea
          name="description"
          defaultValue={entry.description}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={updatePending} className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50">
            {updatePending ? "…" : "Enregistrer"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-slate-500">
            Annuler
          </button>
          {updateState.status === "error" && <span className="text-xs text-red-600">{updateState.message}</span>}
        </div>
      </form>
    );
  }

  return (
    <div className="p-4 text-sm">
      <p className="whitespace-pre-wrap text-slate-800">{entry.description}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
        <span>{formatDateTime(entry.date)}</span>
        <span>{entry.origine}</span>
        {tache && (
          <Link href={`/taches/${tache.id}`} className="text-slate-500 underline hover:text-slate-900">
            {tache.nom}
          </Link>
        )}
        {canEdit && (
          <>
            <button onClick={() => setEditing(true)} className="text-slate-500 underline hover:text-slate-900">
              Modifier
            </button>
            <form action={deleteAction} className="inline">
              <input type="hidden" name="id" value={entry.id} />
              <button type="submit" disabled={deletePending} className="text-red-600 underline hover:text-red-800">
                {deletePending ? "…" : "Supprimer"}
              </button>
            </form>
          </>
        )}
      </div>
      {deleteState.status === "error" && <p className="mt-1 text-xs text-red-600">{deleteState.message}</p>}
    </div>
  );
}
