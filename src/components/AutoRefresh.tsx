"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Rafraîchit silencieusement les données de la page en cours toutes les
 * `intervalMs` millisecondes, sans rechargement complet. Choix fait à la place
 * d'un couple SWR + routes API JSON dédiées (suggéré dans le cahier des
 * charges) : les pages sont des Server Components qui lisent déjà Airtable au
 * rendu (avec le cache serveur de 20s, voir lib/airtable/client.ts) — router.
 * refresh() ré-exécute ce rendu serveur à intervalle régulier, ce qui donne le
 * même effet de mise à jour "quasi immédiate" sans dupliquer chaque écran
 * derrière une route JSON séparée.
 */
export function AutoRefresh({ intervalMs = 20000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
