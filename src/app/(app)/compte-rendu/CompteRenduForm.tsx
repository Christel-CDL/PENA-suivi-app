"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { creerCompteRenduAction, type CompteRenduState } from "./actions";
import { TYPES_COMPTE_RENDU, LIBELLES_TYPE } from "./types";
import { ContactPicker } from "@/components/ContactPicker";
import { PilotageFields } from "@/components/PilotageFields";
import { TACHE_STATUTS } from "@/lib/airtable/constants";

export type SujetOption = {
  id: string;
  nom: string;
  voletId: string;
  statut: string;
  prochaineEtape: string;
  balleChez: string;
  prochainPoint: string | null;
  /** L'utilisateur peut-il mettre à jour ce sujet (Admin ou responsable) ? Revérifié côté serveur. */
  modifiable: boolean;
};

type Option = { id: string; nom: string };
type ContactOption = { id: string; label: string };

const CHAMP = "w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm";
const initialState: CompteRenduState = { status: "idle" };

type Props = {
  volets: Option[];
  sujets: SujetOption[];
  contacts: ContactOption[];
  sujetInitialId: string | null;
  maintenant: string;
};

/**
 * Enveloppe : après un enregistrement réussi, affiche la confirmation (venue
 * du serveur, jamais optimiste) puis permet de repartir d'un formulaire vierge
 * en le remontant (changement de `key`).
 */
export function CompteRenduForm(props: Props) {
  const [saisie, setSaisie] = useState(0);
  return <Formulaire key={saisie} {...props} onNouveau={() => setSaisie((n) => n + 1)} />;
}

function Formulaire({ volets, sujets, contacts, sujetInitialId, maintenant, onNouveau }: Props & { onNouveau: () => void }) {
  const [state, formAction, pending] = useActionState(creerCompteRenduAction, initialState);
  const sujetInitial = sujets.find((s) => s.id === sujetInitialId);
  const [voletId, setVoletId] = useState(sujetInitial?.voletId ?? "");
  const [tacheId, setTacheId] = useState(sujetInitial?.id ?? "");
  const [participants, setParticipants] = useState<ContactOption[]>([]);
  const [majSujet, setMajSujet] = useState(false);

  const sujetsDuVolet = sujets.filter((s) => s.voletId === voletId);
  const sujet = sujets.find((s) => s.id === tacheId);

  if (state.status === "success") {
    return (
      <div role="status" className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-medium">{state.message}</p>
        <div className="flex flex-wrap gap-4">
          {state.tacheId && (
            <Link href={`/taches/${state.tacheId}`} className="underline hover:text-emerald-700">
              Voir le sujet
            </Link>
          )}
          <button type="button" onClick={onNouveau} className="underline hover:text-emerald-700">
            Saisir un autre compte-rendu
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      // Pas de `action={formAction}` : React viderait le formulaire après chaque envoi,
      // y compris en cas d'erreur — un long compte-rendu tapé serait perdu.
      onSubmit={(e) => {
        e.preventDefault();
        const donnees = new FormData(e.currentTarget);
        startTransition(() => formAction(donnees));
      }}
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Date et heure</span>
          <input type="datetime-local" name="date" required defaultValue={maintenant} className={CHAMP} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Type</span>
          <select name="origine" required defaultValue="" className={CHAMP}>
            <option value="" disabled>
              Choisir…
            </option>
            {TYPES_COMPTE_RENDU.map((t) => (
              <option key={t} value={t}>
                {LIBELLES_TYPE[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Volet</span>
          <select
            value={voletId}
            onChange={(e) => {
              setVoletId(e.target.value);
              setTacheId("");
              setMajSujet(false);
            }}
            required
            className={CHAMP}
          >
            <option value="" disabled>
              Choisir un volet…
            </option>
            {volets.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Sujet</span>
          <select
            name="tacheId"
            value={tacheId}
            onChange={(e) => {
              setTacheId(e.target.value);
              setMajSujet(false);
            }}
            required
            disabled={!voletId}
            className={`${CHAMP} disabled:bg-slate-50 disabled:text-slate-400`}
          >
            <option value="" disabled>
              {voletId ? "Choisir un sujet…" : "Choisissez d'abord un volet"}
            </option>
            {sujetsDuVolet.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="text-sm">
        <span className="mb-1 block text-slate-600">Participants (facultatif)</span>
        {participants.map((p) => (
          <input key={p.id} type="hidden" name="participantIds" value={p.id} />
        ))}
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {participants.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              {p.label}
              <button
                type="button"
                onClick={() => setParticipants((l) => l.filter((x) => x.id !== p.id))}
                className="text-slate-400 hover:text-slate-700"
                aria-label={`Retirer ${p.label}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <ContactPicker
          contacts={contacts}
          excludeIds={participants.map((p) => p.id)}
          placeholder="Rechercher un participant par son nom…"
          onPick={(c) => setParticipants((l) => [...l, c])}
        />
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Compte-rendu</span>
        <textarea
          name="description"
          required
          rows={6}
          maxLength={10000}
          placeholder="Ce qui a été vu, dit ou décidé — factuel, sans donnée de facturation ni de santé de tiers…"
          className={CHAMP}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Lien vers un document (facultatif)</span>
        <input
          type="url"
          name="lienDocument"
          placeholder="https://… (OneDrive, rapport de constat)"
          className={CHAMP}
        />
      </label>

      {sujet && (
        <fieldset className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          {sujet.modifiable ? (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                name="majSujet"
                value="1"
                checked={majSujet}
                onChange={(e) => setMajSujet(e.target.checked)}
              />
              Mettre à jour le sujet en même temps
            </label>
          ) : (
            <p className="text-sm text-slate-500">
              Seul le responsable de ce sujet (ou l&apos;administratrice) peut mettre à jour sa prochaine étape.
            </p>
          )}
          {majSujet && sujet.modifiable && (
            // key : prérempli avec les valeurs du sujet choisi, remonté si on en change.
            <div key={sujet.id} className="space-y-3">
              <PilotageFields valeurs={sujet} requis={false} />
              <label className="block text-sm sm:w-1/3">
                <span className="mb-1 block text-slate-600">Statut</span>
                <select name="statut" defaultValue={sujet.statut} className={CHAMP}>
                  {TACHE_STATUTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-50">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {state.status === "error" && (
          <span role="alert" className="text-sm text-red-600">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
