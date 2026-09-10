"use client";

import { useRef, useState } from "react";

type ContactOption = { id: string; label: string };

/**
 * Sélecteur de contact par recherche texte — pas de menu déroulant classique
 * (trop long avec une vingtaine de contacts, voir retour de Christel). On
 * tape quelques lettres, une courte liste filtrée apparaît, on clique.
 *
 * Deux modes : sélection unique (par défaut — un champ caché `name` porte
 * l'ID choisi, affiché ensuite comme une puce cliquable pour la changer),
 * ou ajout répété via `onPick` (le champ reste une recherche vide après
 * chaque choix, pour construire une liste ailleurs — voir PartiesPrenantesField).
 */
export function ContactPicker({
  name,
  contacts,
  defaultValue,
  placeholder = "Rechercher un contact…",
  excludeIds = [],
  onPick,
}: {
  name?: string;
  contacts: ContactOption[];
  defaultValue?: ContactOption;
  placeholder?: string;
  excludeIds?: string[];
  onPick?: (contact: ContactOption) => void;
}) {
  const [selected, setSelected] = useState<ContactOption | null>(defaultValue ?? null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const excluded = new Set(excludeIds);
  const matches =
    query.trim().length > 0
      ? contacts
          .filter((c) => !excluded.has(c.id) && c.label.toLowerCase().includes(query.trim().toLowerCase()))
          .slice(0, 8)
      : [];

  function pick(c: ContactOption) {
    setOpen(false);
    if (onPick) {
      onPick(c);
      setQuery("");
    } else {
      setSelected(c);
    }
  }

  function startChanging() {
    setSelected(null);
    setQuery("");
    // La puce disparaît et cède la place au champ de recherche : on lui
    // redonne le focus tout de suite pour pouvoir retaper sans re-cliquer.
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div className="relative">
      {name && <input type="hidden" name={name} value={selected?.id ?? ""} />}

      {selected && !onPick ? (
        <button
          type="button"
          onClick={startChanging}
          className="flex w-full items-center justify-between rounded-md border border-slate-300 px-3 py-1.5 text-left text-sm hover:border-slate-400"
        >
          <span>{selected.label}</span>
          <span className="ml-2 text-slate-400" aria-hidden>
            ✕
          </span>
        </button>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      )}

      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white text-sm shadow-md">
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                // Sans ça, le clic déclenche d'abord le blur du champ texte
                // (qui referme la liste) avant que le clic lui-même ne soit
                // traité : il fallait cliquer deux fois pour que ça "prenne".
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
                className="block w-full px-3 py-1.5 text-left hover:bg-slate-100"
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
