"use client";

import { useActionState, useState } from "react";
import { updateTacheAction, createPrestataireAction, type FormState } from "./actions";
import { TACHE_STATUTS, TACHE_PRIORITES, CONTACT_CATEGORIES } from "@/lib/airtable/constants";
import { ContactPicker } from "@/components/ContactPicker";
import type { Tache } from "@/lib/airtable/taches";
import type { Contact } from "@/lib/airtable/contacts";

const initialState: FormState = { status: "idle" };

export function TaskEditForm({
  tache,
  contacts,
  isAdmin,
}: {
  tache: Tache;
  contacts: Contact[];
  isAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateTacheAction, initialState);
  const [prestState, prestFormAction, prestPending] = useActionState(createPrestataireAction, initialState);
  const [showNewPrestataire, setShowNewPrestataire] = useState(false);

  // Ferme le bloc "nouveau prestataire" dès que sa création réussit, sans
  // passer par un effet (pattern "ajuster un état pendant le rendu"
  // recommandé par React plutôt qu'un useEffect + setState).
  const [lastPrestState, setLastPrestState] = useState(prestState);
  if (prestState !== lastPrestState) {
    setLastPrestState(prestState);
    if (prestState.status === "success") setShowNewPrestataire(false);
  }

  const toOption = (c: Contact) => ({ id: c.id, label: c.organisation ? `${c.nom} (${c.organisation})` : c.nom });
  const allContactOptions = contacts.map(toOption).sort((a, b) => a.label.localeCompare(b.label));
  // Le champ de recherche ne propose que les contacts tagués "Prestataire"
  // (voir Catégorie sur la fiche contact) ; la valeur déjà assignée reste
  // affichée même si elle n'est pas/plus tagée ainsi.
  const prestataireOptions = contacts
    .filter((c) => c.categories.includes("Prestataire"))
    .map(toOption)
    .sort((a, b) => a.label.localeCompare(b.label));
  const prestataireActuel = allContactOptions.find((c) => c.id === tache.prestataireContactIds[0]);

  return (
    // Un seul <form> pour tout : le bouton "Créer et assigner" du bloc
    // prestataire cible une action différente via formAction, ce qui évite
    // d'imbriquer un second <form> (interdit en HTML) tout en gardant le
    // nouveau contact affiché au bon endroit — sous Échéance/Prestataire,
    // avant Description.
    <form action={formAction} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <input type="hidden" name="id" value={tache.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Statut</span>
          <select name="statut" defaultValue={tache.statut} className="w-full rounded-md border border-slate-300 px-3 py-1.5">
            {TACHE_STATUTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Priorité</span>
          <select name="priorite" defaultValue={tache.priorite} className="w-full rounded-md border border-slate-300 px-3 py-1.5">
            {TACHE_PRIORITES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Échéance</span>
          <input
            type="date"
            name="echeance"
            defaultValue={tache.echeance ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5"
          />
        </label>

        {/*
          Un <div>, pas un <label> : un <label> qui contient plusieurs
          éléments cliquables (le champ ET le lien "+ Nouveau prestataire")
          propage le clic sur le premier contrôle rencontré — c'est ce qui
          effaçait le champ même en cliquant sur le lien en dessous.
        */}
        <div className="text-sm">
          <span className="mb-1 block text-slate-600">Prestataire</span>
          <ContactPicker name="prestataireContactId" contacts={prestataireOptions} defaultValue={prestataireActuel} />
          {tache.prestataireContactIds.length === 0 && tache.prestataireAncienTexte && (
            <p className="mt-1 text-xs text-slate-400">
              Ancienne valeur non liée à un contact : {tache.prestataireAncienTexte}
            </p>
          )}
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setShowNewPrestataire((v) => !v)}
              className="mt-1 text-xs text-slate-500 underline hover:text-slate-900"
            >
              {showNewPrestataire ? "Annuler" : "+ Nouveau prestataire"}
            </button>
          ) : (
            <p className="mt-1 text-xs text-slate-400">
              Le prestataire recherché n&apos;existe pas ? Seul l&apos;administrateur peut en créer un.
            </p>
          )}
        </div>
      </div>

      {isAdmin && showNewPrestataire && (
        <div className="space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Nouveau contact prestataire</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="nom" placeholder="Nom" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
            <input name="organisation" placeholder="Organisation" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
            <input name="fonction" placeholder="Fonction" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
            <input name="email" type="email" placeholder="E-mail" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
            <input name="telephone" placeholder="Téléphone" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-slate-500">Catégorie :</span>
            {CONTACT_CATEGORIES.map((cat) => (
              <label key={cat} className="flex items-center gap-1.5">
                <input type="checkbox" name="categories" value={cat} defaultChecked={cat === "Prestataire"} />
                {cat}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              formAction={prestFormAction}
              disabled={prestPending}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {prestPending ? "Création…" : "Créer et assigner"}
            </button>
            {prestState.status === "error" && <span className="text-sm text-red-600">{prestState.message}</span>}
          </div>
        </div>
      )}

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Description des objectifs</span>
        <textarea
          name="description"
          defaultValue={tache.description}
          rows={4}
          className="w-full rounded-md border border-slate-300 px-3 py-1.5"
        />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-50">
          {pending ? "Enregistrement…" : "Enregistrer"}
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
