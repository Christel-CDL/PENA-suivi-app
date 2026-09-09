"use client";

import { useActionState } from "react";
import { addCommentAction, type FormState } from "./actions";

const initialState: FormState = { status: "idle" };

export function CommentForm({ tacheId }: { tacheId: string }) {
  const [state, formAction, pending] = useActionState(addCommentAction, initialState);

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
      <input type="hidden" name="id" value={tacheId} />
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Ajouter un commentaire au journal</span>
        <textarea
          name="description"
          rows={3}
          required
          placeholder="Compte rendu factuel, sans donnée de facturation ni de santé de tiers…"
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-50">
          {pending ? "Envoi…" : "Ajouter au journal"}
        </button>
        {state.status !== "idle" && (
          <span className={`text-sm ${state.status === "error" ? "text-red-600" : "text-emerald-700"}`}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
