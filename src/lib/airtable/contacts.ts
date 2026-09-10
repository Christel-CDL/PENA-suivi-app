import "server-only";
import { listRecords, createRecords, updateRecords } from "./client";
import { TABLES, CONTACTS_FIELDS as F } from "./constants";

export type Contact = {
  id: string;
  nom: string;
  organisation: string;
  fonction: string;
  complements: string;
  email: string;
  telephone: string;
  projetIds: string[];
  categories: string[];
};

type RawFields = {
  [F.NOM]?: string;
  [F.ORGANISATION]?: string;
  [F.FONCTION]?: string;
  [F.COMPLEMENTS]?: string;
  [F.EMAIL]?: string;
  [F.TELEPHONE]?: string;
  [F.PROJETS_ASSOCIES]?: string[];
  [F.CATEGORIE]?: string[];
};

export async function listContacts(): Promise<Contact[]> {
  const records = await listRecords<RawFields>(TABLES.CONTACTS);
  return records.map((r) => ({
    id: r.id,
    nom: r.fields[F.NOM] ?? "",
    organisation: r.fields[F.ORGANISATION] ?? "",
    fonction: r.fields[F.FONCTION] ?? "",
    complements: r.fields[F.COMPLEMENTS] ?? "",
    email: r.fields[F.EMAIL] ?? "",
    telephone: r.fields[F.TELEPHONE] ?? "",
    projetIds: r.fields[F.PROJETS_ASSOCIES] ?? [],
    categories: r.fields[F.CATEGORIE] ?? [],
  }));
}

export type ContactInput = {
  nom: string;
  organisation?: string;
  fonction?: string;
  email?: string;
  telephone?: string;
  projetIds?: string[];
  categories?: string[];
};

/** Création/modification — réservées à l'Admin (voir lib/auth/rbac.ts). */
export async function createContact(input: ContactInput) {
  const [record] = await createRecords<RawFields>(TABLES.CONTACTS, [
    {
      fields: {
        [F.NOM]: input.nom,
        [F.ORGANISATION]: input.organisation ?? "",
        [F.FONCTION]: input.fonction ?? "",
        [F.EMAIL]: input.email ?? "",
        [F.TELEPHONE]: input.telephone ?? "",
        [F.PROJETS_ASSOCIES]: input.projetIds ?? [],
        [F.CATEGORIE]: input.categories ?? [],
      },
    },
  ]);
  return record;
}

export async function updateContact(id: string, input: ContactInput) {
  const [record] = await updateRecords<RawFields>(TABLES.CONTACTS, [
    {
      id,
      fields: {
        [F.NOM]: input.nom,
        [F.ORGANISATION]: input.organisation ?? "",
        [F.FONCTION]: input.fonction ?? "",
        [F.EMAIL]: input.email ?? "",
        [F.TELEPHONE]: input.telephone ?? "",
        [F.PROJETS_ASSOCIES]: input.projetIds ?? [],
        [F.CATEGORIE]: input.categories ?? [],
      },
    },
  ]);
  return record;
}
