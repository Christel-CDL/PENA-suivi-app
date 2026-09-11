// IDs Airtable — base "Suivi ICPE Environnement" (voir annexe du cahier des charges).
// Toujours utiliser ces IDs plutôt que des noms de table/champ : ils sont stables
// même si Christel renomme une table ou un champ côté Airtable.

export const BASE_ID = "app6sehe4hMHO1NXe";

export const TABLES = {
  SITES: "tblYGIAqp1jWOXECs",
  SOUS_PROJETS: "tblskCiSVsbQZ2Psl",
  TACHES: "tbl08JtLokfU4MA9U",
  JOURNAL: "tbleeo7rGuwrh01J3",
  CONTACTS: "tbllfX0VF60aiCDFV",
  DOCUMENTS: "tblrm28WmPHBmBoxT",
  UTILISATEURS: "tblGTSEV4SFgB43uQ",
  ENTREES_A_VALIDER: "tblHiNsXnONUGUUVK",
  DEMANDES: "tbleLCwKPI8ZKVWVB",
  PLANNING_VISITES: "tble9ApzEooaJNyw3",
} as const;

export const SITES_FIELDS = {
  NOM: "fldcIKlQjCwdeA44y",
  ADRESSE: "fldyFPpvTCShdNEf6",
  REGIME: "fldZjg2zjJ49tcWSt",
  STATUT: "fldCY98XHLIne6fPA",
  SOUS_PROJETS: "fld3OXOfUPQyu4dZ6",
  CONTACTS: "fldiOsl27tN50PGwG",
  DOCUMENTS: "fldl7ME7dbs1GdX8u",
} as const;

export const SOUS_PROJETS_FIELDS = {
  NOM: "fldOM7S1IISi9wkKm",
  PROJET_ASSOCIE: "fldTudzGtD714k99k",
  DESCRIPTION: "fldPUAetw9MhZVTAi",
  STATUT: "fld0zgW1qsrzCKBLI",
  DATE_FIN: "fldlJfEowEyyW2HmW",
  TACHES: "fldZRBn7JO5ZuDP6f",
} as const;

export const TACHES_FIELDS = {
  NOM: "fld5zG7gky1Im4pSb",
  SOUS_PROJET_ASSOCIE: "fldHy2HCwlHFv6NRm",
  STATUT: "fldaCfuf6QQqTpGMI",
  ECHEANCE: "fldneje1KrSlJLm2Y",
  JOURNAL: "fld2j62ZjircOi6LF",
  DESCRIPTION_OBJECTIFS: "fldR4IHMCkWSDecnq",
  PROCHAINE_RELANCE: "fldvo1S3qprru5eRu",
  DERNIERE_RELANCE: "fldTt0y51ef2ead46",
  PRIORITE: "fldyMQmTNkvmf9Lc8",
  RESPONSABLE_ANCIEN_TEXTE: "fldyXyV6RNiQSVRrg",
  PARTIES_PRENANTES: "fldFwgUhvNl7OGCYm",
  PRESTATAIRE_ANCIEN_TEXTE: "fldKs6Bq29OX09Kbl",
  RESPONSABLE_LIEN: "fldAhpJcotmZCboiD",
  PRESTATAIRE_LIEN: "fldTxUuDSdlDvQtdH",
} as const;

export const JOURNAL_FIELDS = {
  DESCRIPTION: "fldRF7TkYL1CUeJSR",
  DATE: "fldaVSG6YWXCzhb30",
  TACHE_ASSOCIEE: "fldiqeyucyy8J8Wm9",
  CONTACT_ASSOCIE: "flda9vpD03gToMrom",
  DOCUMENT_ASSOCIE: "fldCn0V5mxaNEUWoX",
  SUITES: "fldt82IQ9K4DzVY4k",
  ORIGINE: "fldb9IhUxNickiifo",
} as const;

export const CONTACTS_FIELDS = {
  NOM: "fldLnkgxAKfYP6oyh",
  ORGANISATION: "fldmVCMOVrFJAPEjG",
  FONCTION: "fldUfiJuxkHQcvZPp",
  COMPLEMENTS: "fldbMPmr3sz41Emhv",
  EMAIL: "fldOjp5wilEF5M319",
  TELEPHONE: "fldEmrLl4xAZuYFLY",
  PROJETS_ASSOCIES: "fldIJIqMJ2Chon9Kc",
  CATEGORIE: "fldT8MxgsBv2Ka9cV",
} as const;

// Utilisé pour limiter les champs de recherche de contact (Responsable,
// Prestataire, Parties prenantes) aux personnes taguées en conséquence.
export const CONTACT_CATEGORIES = ["Équipe projet", "Prestataire", "Partie prenante"] as const;

export const DOCUMENTS_FIELDS = {
  TITRE: "fldQNBZjuwogiVPth",
  TYPE: "fldo1oHPa5gSfYCRm",
  FICHIER: "fldIB5Z40hYKeceIB",
  JOURNAL: "fldoawVIIcniRjn6V",
  DATE: "fldmOJfepUjI5SdVU",
  PROJET_ASSOCIE: "fld3V0KHCJER13O5i",
} as const;

export const UTILISATEURS_FIELDS = {
  NOM: "fldkBDweFCszcnoVu",
  EMAIL: "fldjRceMPI9ZYdk7x",
  ROLE: "fldcXkmzHtXoXn2y7",
  SITES_AUTORISES: "fldJcI5hTkyPdPQQ9",
  CONTACT_LIE: "fldMoyT9pJx7buxc9",
  STATUT: "fldRSZNxCkOmt86eZ",
} as const;

export const ENTREES_A_VALIDER_FIELDS = {
  DATE_EMAIL: "fldqeMY0gbHHQlSUN",
  EXPEDITEUR: "fldklS9cEhGVgWw4l",
  RESUME_PROPOSE: "fldJw5tHYusRtj3fr",
  TACHE_SUGGEREE: "fldRlvjCTO6uM9VxL",
  STATUT: "fldXhYl1ENEzAxteW",
  ENTREE_LIEE: "fld99jMDy44gaQvnB",
} as const;

export const PLANNING_VISITES_FIELDS = {
  TITRE: "fldYJwPLx9iyTfjLR",
  DATE: "fldEudIIzKQYXdh1b",
  SITE: "fldkSCBcG0xkGoIkD",
} as const;

export const DEMANDES_FIELDS = {
  TITRE_PROPOSE: "fldDFch6NU7sSljbE",
  TYPE: "fldcflhrrWm7X2Taj",
  DEMANDEUR: "fldVUZ6NasSUz5VVR",
  DATE_DEMANDE: "fldqhTH9d7qwrgLPJ",
  SITE_CONCERNE: "fldtoh1PmVMxli9PJ",
  SOUS_PROJET_PARENT: "fldrbuJt6Yr82Z7Hm",
  DESCRIPTION_JUSTIFICATION: "fldx5NtgIJ43kki6K",
  STATUT: "fldttEGtv4bQyuFr1",
  SOUS_PROJET_CREE: "fld6afnDBQWXinXg4",
  TACHE_CREEE: "fldoav4wLUGrCbKTw",
} as const;

// Valeurs des champs à choix unique, telles qu'elles existent aujourd'hui dans la base.
export const TACHE_STATUTS = ["À faire", "En cours", "Mise en attente", "Terminé", "Annulée"] as const;
export const TACHE_PRIORITES = ["Urgente", "Haute", "Normale", "Basse"] as const;
export const ROLES = ["Admin", "Contributeur"] as const;
export const UTILISATEUR_STATUTS = ["Actif", "Suspendu"] as const;
export const ENTREE_A_VALIDER_STATUTS = ["À valider", "Validée", "Rejetée"] as const;
export const DEMANDE_TYPES = ["Nouveau sous-projet", "Nouvelle tâche"] as const;
export const DEMANDE_STATUTS = ["En attente", "Acceptée", "Refusée"] as const;
