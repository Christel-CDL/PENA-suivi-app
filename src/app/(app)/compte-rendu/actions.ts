"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { lirePilotage } from "@/lib/pilotage";
import { parisLocalVersIso } from "@/lib/format";
import { enregistrerCompteRendu } from "@/lib/services/ecritures";

export type CompteRenduState = {
  status: "idle" | "success" | "error";
  message?: string;
  tacheId?: string;
};

/**
 * Compte-rendu ou action saisi directement (brief v2, §1.4). Les contrôles
 * (périmètre, droits, règle des 3 champs, rien d'enregistré à moitié) sont dans
 * lib/services/ecritures.ts, partagés avec le connecteur Claude. La confirmation
 * n'est renvoyée qu'après la réponse d'Airtable.
 */
export async function creerCompteRenduAction(_prev: CompteRenduState, formData: FormData): Promise<CompteRenduState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée, reconnectez-vous." };

  const dateSaisie = String(formData.get("date") ?? "");
  const dateIso = dateSaisie ? parisLocalVersIso(dateSaisie) : null;
  if (dateSaisie && !dateIso) return { status: "error", message: "Date ou heure invalide." };

  const majSujet = formData.get("majSujet") === "1";
  const r = await enregistrerCompteRendu(user, {
    tacheId: String(formData.get("tacheId") ?? ""),
    origine: String(formData.get("origine") ?? ""),
    description: String(formData.get("description") ?? ""),
    dateIso,
    lienDocument: String(formData.get("lienDocument") ?? ""),
    participantIds: formData.getAll("participantIds").map(String),
    maj: majSujet ? { statut: String(formData.get("statut") ?? "") || undefined, ...lirePilotage(formData) } : null,
  });

  if (!r.ok) {
    const conseil = majSujet && r.message.startsWith("Rien n'a été enregistré : Seul le responsable")
      ? " Décochez « Mettre à jour le sujet » pour enregistrer le compte-rendu seul."
      : "";
    return { status: "error", message: r.message + conseil, tacheId: r.tacheId };
  }
  return { status: "success", message: r.message, tacheId: r.tacheId };
}
