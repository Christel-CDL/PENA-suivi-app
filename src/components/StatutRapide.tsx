"use client";

import { useState, useTransition } from "react";
import { TACHE_STATUTS } from "@/lib/airtable/constants";
import { bulkStatutAction } from "@/app/(app)/taches/actions";

/**
 * Changement de statut d'un sujet en un clic (tableau de bord). Passe par la
 * même action serveur que le changement en lot : droits (Admin ou responsable)
 * et règle des 3 champs revérifiés côté serveur. Enregistré dès le choix.
 */
export function StatutRapide({ tacheId, statut }: { tacheId: string; statut: string }) {
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <span className="flex flex-col items-end gap-1">
      <select
        // key : revient à la valeur enregistrée si le serveur refuse ou après rafraîchissement.
        key={statut}
        defaultValue={statut}
        disabled={pending}
        aria-label="Changer le statut"
        onChange={(e) => {
          const nouveau = e.target.value;
          setErreur(null);
          startTransition(async () => {
            const r = await bulkStatutAction([tacheId], nouveau);
            if (r.status === "error") {
              setErreur(r.message);
              e.target.value = statut;
            }
          });
        }}
        className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700 disabled:opacity-50"
      >
        {TACHE_STATUTS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {pending && <span className="text-xs text-slate-400">Enregistrement…</span>}
      {erreur && (
        <span role="alert" className="max-w-xs text-right text-xs text-red-600">
          {erreur}
        </span>
      )}
    </span>
  );
}
