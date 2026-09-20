"use client";

import { useMemo, useState } from "react";

export type TacheOption = {
  id: string;
  nom: string;
  sousProjetId: string | null;
  sousProjetNom: string;
  siteId: string | null;
  siteNom: string;
};

export type PickerData = {
  taches: TacheOption[];
  sites: { id: string; nom: string }[];
  sousProjets: { id: string; nom: string; siteId: string | null }[];
};

const MAX_RESULTATS = 40;

function normaliser(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Choix d'une tâche par mots-clés, avec filtres facultatifs par site et par
 * sous-projet. Renvoie l'id choisi dans un champ caché (`name`), vide si aucune
 * tâche n'est sélectionnée.
 */
export function TachePicker({
  name,
  data,
  defaultId,
}: {
  name: string;
  data: PickerData;
  defaultId?: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(defaultId ?? null);
  const [q, setQ] = useState("");
  const [siteId, setSiteId] = useState("");
  const [sousProjetId, setSousProjetId] = useState("");

  const selected = data.taches.find((t) => t.id === selectedId) ?? null;
  const sousProjetsVisibles = data.sousProjets.filter((sp) => !siteId || sp.siteId === siteId);

  const resultats = useMemo(() => {
    const mots = normaliser(q).split(/\s+/).filter(Boolean);
    return data.taches
      .filter((t) => {
        if (siteId && t.siteId !== siteId) return false;
        if (sousProjetId && t.sousProjetId !== sousProjetId) return false;
        const meule = normaliser(`${t.siteNom} ${t.sousProjetNom} ${t.nom}`);
        return mots.every((m) => meule.includes(m));
      })
      .sort(
        (a, b) =>
          a.siteNom.localeCompare(b.siteNom) ||
          a.sousProjetNom.localeCompare(b.sousProjetNom) ||
          a.nom.localeCompare(b.nom),
      );
  }, [data.taches, q, siteId, sousProjetId]);

  const contexte = (t: TacheOption) => [t.siteNom, t.sousProjetNom].filter(Boolean).join(" › ");

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={selectedId ?? ""} />

      {selected ? (
        <div className="flex items-start justify-between gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
          <div>
            <p className="font-medium text-slate-900">{selected.nom}</p>
            <p className="text-xs text-slate-500">{contexte(selected)}</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="shrink-0 text-xs text-slate-500 underline hover:text-slate-900"
          >
            Changer
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={siteId}
              onChange={(e) => {
                setSiteId(e.target.value);
                setSousProjetId("");
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              aria-label="Filtrer par site"
            >
              <option value="">Tous les sites</option>
              {data.sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
            <select
              value={sousProjetId}
              onChange={(e) => setSousProjetId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              aria-label="Filtrer par sous-projet"
            >
              <option value="">Tous les sous-projets</option>
              {sousProjetsVisibles.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.nom}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            placeholder="Rechercher par mots-clés (tâche, sous-projet, site)…"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />

          <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200 bg-white">
            {resultats.length === 0 && <p className="p-3 text-sm text-slate-500">Aucune tâche ne correspond.</p>}
            {resultats.slice(0, MAX_RESULTATS).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="block text-slate-900">{t.nom}</span>
                <span className="block text-xs text-slate-500">{contexte(t)}</span>
              </button>
            ))}
            {resultats.length > MAX_RESULTATS && (
              <p className="p-2 text-center text-xs text-slate-400">
                {resultats.length - MAX_RESULTATS} autres résultats — affinez la recherche.
              </p>
            )}
          </div>
          <p className="text-xs text-slate-400">Sans choix, l&apos;entrée sera publiée au journal sans tâche rattachée.</p>
        </>
      )}
    </div>
  );
}
