"use client";

import { useActionState } from "react";
import { accepterDemandeAction, refuserDemandeAction, type FormState } from "./actions";

const initialState: FormState = { status: "idle" };

export function AccepterButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(accepterDemandeAction, initialState);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50">
        {pending ? "…" : "Accepter"}
      </button>
      {state.status === "error" && <span className="text-xs text-red-600">{state.message}</span>}
    </form>
  );
}

export function RefuserButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(refuserDemandeAction, initialState);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 disabled:opacity-50">
        {pending ? "…" : "Refuser"}
      </button>
      {state.status === "error" && <span className="text-xs text-red-600">{state.message}</span>}
    </form>
  );
}
