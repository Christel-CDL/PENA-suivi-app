import "server-only";
import { listRecords } from "./client";
import { TABLES, UTILISATEURS_FIELDS as F } from "./constants";

export type Role = "Admin" | "Contributeur";

export type Utilisateur = {
  id: string;
  nom: string;
  email: string;
  role: Role;
  siteIds: string[];
  contactId: string | null;
  actif: boolean;
};

type RawFields = {
  [F.NOM]?: string;
  [F.EMAIL]?: string;
  [F.ROLE]?: string;
  [F.SITES_AUTORISES]?: string[];
  [F.CONTACT_LIE]?: string[];
  [F.STATUT]?: string;
};

/**
 * Liste des utilisateurs autorisés, telle que gérée par Christel dans Airtable.
 * Table UTILISATEURS — voir section 4 du cahier des charges.
 */
export async function listUtilisateurs(): Promise<Utilisateur[]> {
  const records = await listRecords<RawFields>(TABLES.UTILISATEURS);
  return records.map((r) => ({
    id: r.id,
    nom: r.fields[F.NOM] ?? "",
    email: (r.fields[F.EMAIL] ?? "").trim().toLowerCase(),
    role: (r.fields[F.ROLE] as Role) ?? "Contributeur",
    siteIds: r.fields[F.SITES_AUTORISES] ?? [],
    contactId: r.fields[F.CONTACT_LIE]?.[0] ?? null,
    actif: r.fields[F.STATUT] === "Actif",
  }));
}

/**
 * Retrouve un utilisateur par e-mail (comparaison insensible à la casse).
 * Utilisé à la fois pour l'envoi du lien magique et à chaque requête serveur
 * pour vérifier les droits en direct (voir section 5 : le contrôle d'accès ne
 * doit jamais se fier à une donnée mise en cache dans la session).
 */
export async function findUtilisateurByEmail(email: string): Promise<Utilisateur | null> {
  const normalized = email.trim().toLowerCase();
  const all = await listUtilisateurs();
  return all.find((u) => u.email === normalized) ?? null;
}
