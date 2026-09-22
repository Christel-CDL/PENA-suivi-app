"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { StatusBadge } from "@/components/StatusBadge";

export type JourCalendrier = {
  date: string; // YYYY-MM-DD
  jour: string; // "Lun", "Mar"…
  numero: string; // "22"
  moisLabel: string | null; // "Septembre" sur le 1er du mois affiché, sinon null
  estAujourdhui: boolean;
  weekEnd: boolean;
  sites: string[];
  taches: { id: string; nom: string; statut: string; siteNom: string }[];
};

const LARGEUR_COL = 132; // px — garder synchronisé avec la classe w-[132px] ci-dessous

export function PlanningCalendrier({ jours }: { jours: JourCalendrier[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ouvre la vue sur la semaine en cours plutôt que sur le tout début de la plage.
  useEffect(() => {
    const i = jours.findIndex((j) => j.estAujourdhui);
    if (i > 0 && scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, (i - 1) * LARGEUR_COL);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function decaler(semaines: number) {
    scrollRef.current?.scrollBy({ left: semaines * 7 * LARGEUR_COL, behavior: "smooth" });
  }

  function allerAujourdhui() {
    const i = jours.findIndex((j) => j.estAujourdhui);
    if (i >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ left: Math.max(0, (i - 1) * LARGEUR_COL), behavior: "smooth" });
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2 text-sm">
        <button type="button" onClick={() => decaler(-1)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 hover:bg-slate-100">
          ← Semaine
        </button>
        <button type="button" onClick={allerAujourdhui} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 hover:bg-slate-100">
          Aujourd&apos;hui
        </button>
        <button type="button" onClick={() => decaler(1)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 hover:bg-slate-100">
          Semaine →
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-lg border border-slate-200 bg-white"
      >
        {jours.map((j) => (
          <div
            key={j.date}
            className={`w-[132px] shrink-0 snap-start border-r border-slate-200 last:border-r-0 ${
              j.weekEnd ? "bg-slate-50" : ""
            } ${j.estAujourdhui ? "ring-2 ring-inset ring-slate-900" : ""}`}
          >
            <div className="sticky top-0 border-b border-slate-200 bg-white px-2 py-1.5 text-center">
              {j.moisLabel && <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{j.moisLabel}</p>}
              <p className={`text-xs ${j.estAujourdhui ? "font-semibold text-slate-900" : "text-slate-500"}`}>{j.jour}</p>
              <p className={`text-sm ${j.estAujourdhui ? "font-semibold text-slate-900" : "text-slate-700"}`}>{j.numero}</p>
            </div>
            <div className="min-h-24 space-y-1 p-1.5">
              {j.sites.map((nom) => (
                <p key={nom} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-center text-[11px] leading-tight text-slate-700">
                  {nom}
                </p>
              ))}
              {j.taches.map((t) => (
                <Link
                  key={t.id}
                  href={`/taches/${t.id}`}
                  className="block rounded-md border border-slate-200 px-1.5 py-1 text-[11px] leading-tight text-slate-700 hover:bg-slate-50"
                  title={t.nom}
                >
                  <span className="line-clamp-2">{t.nom}</span>
                  {t.siteNom && <span className="block truncate text-slate-400">{t.siteNom}</span>}
                  <span className="mt-0.5 block">
                    <StatusBadge value={t.statut} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
