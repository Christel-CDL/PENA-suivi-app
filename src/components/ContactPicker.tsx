"use client";

import { useState } from "react";

type ContactOption = { id: string; label: string };

/**
 * Sélecteur de contact par recherche texte — pas de menu déroulant classique
 * (trop long avec une vingtaine de contacts, voir retour de Christel). On
 * tape quelques lettres, une courte liste filtrée apparaît, on clique.
 */
export function ContactPicker({
  name,
  contacts,
  defaultValue,
  placeholder = "Rechercher un contact…",
}: {
  name: string;
  contacts: ContactOption[];
  defaultValue?: ContactOption;
  placeholder?: string;
}) {
  const [selected, setSelected] = useState<ContactOption | null>(defaultValue ?? null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches =
    query.trim().length > 0
      ? contacts.filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
      : [];

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ""} />

      {selected ? (
        <div className="flex items-center justify-between rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          <span>{selected.label}</span>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setQuery("");
            }}
            className="ml-2 text-slate-400 hover:text-slate-700"
            aria-label="Retirer"
          >
            ✕
          </button>
        </div>
      ) : (
        <input
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

      {open && !selected && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white text-sm shadow-md">
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                // Sans ça, le clic déclenche d'abord le blur du champ texte
                // (qui referme la liste) avant que le clic lui-même ne soit
                // traité : il fallait cliquer deux fois pour que ça "prenne".
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSelected(c);
                  setOpen(false);
                }}
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
