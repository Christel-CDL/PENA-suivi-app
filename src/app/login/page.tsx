"use client";

import { useActionState } from "react";
import { requestMagicLink, type RequestLinkState } from "./actions";

const initialState: RequestLinkState = { status: "idle" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(requestMagicLink, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Suivi ICPE — PENA</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connexion par lien magique. Saisissez votre adresse e-mail professionnelle.
        </p>

        <form action={formAction} className="mt-6 space-y-3">
          <input
            type="email"
            name="email"
            required
            placeholder="vous@exemple.fr"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {pending ? "Envoi en cours…" : "Recevoir le lien de connexion"}
          </button>
        </form>

        {state.status !== "idle" && (
          <p
            className={`mt-4 text-sm ${state.status === "error" ? "text-red-600" : "text-emerald-700"}`}
          >
            {state.message}
          </p>
        )}

        <p className="mt-6 text-xs text-slate-400">
          Usage réservé aux parties prenantes du dossier PENA. Accès géré par CDL Expertises.
        </p>
      </div>
    </main>
  );
}
