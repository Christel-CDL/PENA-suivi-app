"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { SousProjetSelect, type SousProjetGroupe } from "@/components/SousProjetSelect";
import { TACHE_STATUTS } from "@/lib/airtable/constants";
import { bulkStatutAction, bulkDeplacerAction, bulkRegrouperAction, type BulkResult } from "./actions";

export type LigneTache = {
  id: string;
  nom: string;
  priorite: string;
  statut: string;
  responsables: string;
  prestataire: string;
  echeanceLabel: string;
  enRetard: boolean;
  /** Case cochable : Admin partout, Contributeur seulement sur ses propres tâches. */
  selectable: boolean;
  siteId: string | null;
};

export type GroupeTaches = { id: string; nom: string; taches: LigneTache[] };

const CONTROLE = "rounded-md border border-slate-300 bg-white px-2 py-1 text-sm";

export function TachesListe({
  groupes,
  sousProjets,
  sites,
  isAdmin,
}: {
  groupes: GroupeTaches[];
  sousProjets: SousProjetGroupe[];
  sites: { id: string; nom: string }[];
  isAdmin: boolean;
}) {
  const [regrouper, setRegrouper] = useState(false);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [resultat, setResultat] = useState<BulkResult | null>(null);
  const [pending, startTransition] = useTransition();

  // La liste se rafraîchit toute seule (filtres, AutoRefresh) : on ne garde de
  // la sélection que ce qui est encore affiché.
  const visibles = new Set(groupes.flatMap((g) => g.taches.map((t) => t.id)));
  const selection = [...coches].filter((id) => visibles.has(id));
  const selectionSet = new Set(selection);

  // Site proposé pour un nouveau sous-projet : celui des tâches cochées, s'il est unique.
  const siteParId = new Map(groupes.flatMap((g) => g.taches.map((t) => [t.id, t.siteId] as const)));
  const sitesCoches = new Set(selection.map((id) => siteParId.get(id) ?? null));
  const siteParDefaut = sitesCoches.size === 1 ? ([...sitesCoches][0] ?? "") : "";

  function basculer(id: string) {
    setResultat(null);
    setCoches((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  function basculerGroupe(lignes: LigneTache[], toutCoche: boolean) {
    setResultat(null);
    setCoches((prev) => {
      const suivant = new Set(prev);
      for (const l of lignes) {
        if (toutCoche) suivant.delete(l.id);
        else suivant.add(l.id);
      }
      return suivant;
    });
  }

  function lancer(action: () => Promise<BulkResult>) {
    startTransition(async () => {
      const r = await action();
      setResultat(r);
      if (r.status === "success") {
        setCoches(new Set());
        setRegrouper(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      {resultat && (
        <p
          role="status"
          className={`rounded-md px-3 py-2 text-sm ${
            resultat.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {resultat.message}
        </p>
      )}

      {selection.length > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-300 bg-white p-3 text-sm shadow-sm">
          <span className="font-medium text-slate-800">
            {selection.length} tâche{selection.length > 1 ? "s" : ""} sélectionnée{selection.length > 1 ? "s" : ""}
          </span>

          <form
            action={(fd) => lancer(() => bulkStatutAction(selection, String(fd.get("statut") ?? "")))}
            className="flex items-center gap-2"
          >
            <select name="statut" required defaultValue="" className={CONTROLE} aria-label="Nouveau statut">
              <option value="" disabled>
                Changer le statut…
              </option>
              {TACHE_STATUTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              {pending ? "…" : "Appliquer"}
            </button>
          </form>

          {isAdmin && (
            <form
              action={(fd) => lancer(() => bulkDeplacerAction(selection, String(fd.get("sousProjetId") ?? "")))}
              className="flex items-center gap-2"
            >
              <SousProjetSelect name="sousProjetId" sousProjets={sousProjets} className={CONTROLE} />
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-50"
              >
                {pending ? "…" : "Déplacer vers ce sous-projet"}
              </button>
            </form>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setRegrouper((v) => !v)}
              className="text-slate-700 underline hover:text-slate-900"
            >
              {regrouper ? "Annuler le regroupement" : "Regrouper dans un nouveau sous-projet"}
            </button>
          )}

          <button
            type="button"
            onClick={() => setCoches(new Set())}
            className="text-slate-500 underline hover:text-slate-900"
          >
            Tout désélectionner
          </button>

          {isAdmin && regrouper && (
            <form
              action={(fd) =>
                lancer(() =>
                  bulkRegrouperAction(selection, String(fd.get("nom") ?? ""), String(fd.get("siteId") ?? "")),
                )
              }
              className="flex w-full flex-wrap items-center gap-2 border-t border-slate-200 pt-3"
            >
              <input
                name="nom"
                required
                maxLength={120}
                placeholder="Nom du nouveau sous-projet"
                className={`${CONTROLE} min-w-64 flex-1`}
              />
              <select
                key={siteParDefaut}
                name="siteId"
                required
                defaultValue={siteParDefaut}
                className={CONTROLE}
                aria-label="Site du nouveau sous-projet"
              >
                <option value="" disabled>
                  Site…
                </option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-50"
              >
                {pending ? "…" : "Créer et regrouper"}
              </button>
            </form>
          )}
        </div>
      )}

      {groupes.map((groupe) => {
        const cochables = groupe.taches.filter((t) => t.selectable);
        const toutCoche = cochables.length > 0 && cochables.every((t) => selectionSet.has(t.id));
        return (
          <section key={groupe.id}>
            <div className="mb-2 flex items-center gap-2">
              {cochables.length > 0 && (
                <input
                  type="checkbox"
                  checked={toutCoche}
                  onChange={() => basculerGroupe(cochables, toutCoche)}
                  aria-label={`Sélectionner toutes les tâches de ${groupe.nom}`}
                />
              )}
              <h2 className="text-lg font-semibold text-slate-800">
                {groupe.nom} <span className="text-sm font-normal text-slate-400">({groupe.taches.length})</span>
              </h2>
            </div>
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {groupe.taches.map((t) => (
                <div key={t.id} className="flex items-start gap-3 p-4 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="mt-1.5"
                    disabled={!t.selectable}
                    checked={selectionSet.has(t.id)}
                    onChange={() => basculer(t.id)}
                    aria-label={`Sélectionner ${t.nom}`}
                  />
                  <Link href={`/taches/${t.id}`} className="block min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{t.nom}</p>
                      <div className="flex items-center gap-2">
                        <StatusBadge value={t.priorite} />
                        <StatusBadge value={t.statut} />
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      {t.responsables && <span>Responsable : {t.responsables}</span>}
                      {t.prestataire && <span>Prestataire : {t.prestataire}</span>}
                      <span className={t.enRetard ? "font-medium text-red-600" : ""}>Échéance : {t.echeanceLabel}</span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
