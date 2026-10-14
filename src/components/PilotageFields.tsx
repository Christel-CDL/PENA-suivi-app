import { BALLE_CHEZ } from "@/lib/airtable/constants";

const CHAMP = "w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm";

/**
 * Les trois champs de pilotage d'un sujet (Prochaine étape, Balle chez,
 * Prochain point), avec les noms d'input lus par lirePilotage() côté serveur.
 * Utilisé par la fiche sujet, la création de sujet, l'acceptation d'une
 * demande, la validation d'une entrée et le compte-rendu. Champs non
 * contrôlés : le parent fournit un `key` pour les remonter si les valeurs changent.
 */
export function PilotageFields({
  valeurs,
  requis = true,
}: {
  valeurs?: { prochaineEtape: string; balleChez: string; prochainPoint: string | null };
  /** false pour un bloc facultatif (ex. « Mettre à jour le sujet » d'un compte-rendu). */
  requis?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
      <label className="text-sm">
        <span className="mb-1 block text-slate-600">Prochaine étape</span>
        <textarea
          name="prochaineEtape"
          rows={2}
          required={requis}
          defaultValue={valeurs?.prochaineEtape ?? ""}
          placeholder="Ce qui doit se passer ensuite, et par qui…"
          className={CHAMP}
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-slate-600">Balle chez</span>
        <select name="balleChez" required={requis} defaultValue={valeurs?.balleChez ?? ""} className={CHAMP}>
          <option value="">—</option>
          {BALLE_CHEZ.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-slate-600">Prochain point</span>
        <input
          type="date"
          name="prochainPoint"
          required={requis}
          defaultValue={valeurs?.prochainPoint ?? ""}
          className={CHAMP}
        />
      </label>
    </div>
  );
}
