# Notes techniques — Suivi ICPE PENA

Document de reprise pour continuer le développement/débogage dans une autre conversation. Écrit pour un futur moi (Claude) qui n'aura pas le contexte de cette session — pas pour Christel (voir [GUIDE.md](GUIDE.md) pour son usage à elle).

## 1. Le projet en une phrase

Application de suivi de dossier ICPE (réglementation environnementale industrielle) pour deux sites clients de CDL Expertises (PENA Métaux, PENA Environnement), construite d'après un cahier des charges initial (`prompt-claude-code-app-pena.md`, fourni en pièce jointe au tout début du projet — pas versionné dans le repo). Utilisatrice principale/Admin : Christel Lacome (christel.lacome@cdl-expertises.com), dirigeante de CDL Expertises, non-développeuse.

## 2. Stack

Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4, React 19. `jose` pour les JWT (session + lien magique), `nodemailer` pour l'envoi d'e-mail, `swr` côté client (auto-refresh), `zod`. Voir [AGENTS.md](AGENTS.md) : ce projet utilise volontairement une version de Next.js "pas comme dans les données d'entraînement" — toujours vérifier `node_modules/next/dist/docs/` avant d'utiliser une API dont on n'est pas sûr.

## 3. Source de vérité : Airtable

**Jamais de base de données propre à l'app.** Tout lit/écrit directement dans la base Airtable "Suivi ICPE Environnement", `BASE_ID = app6sehe4hMHO1NXe`. IDs de tables et de champs centralisés dans [src/lib/airtable/constants.ts](src/lib/airtable/constants.ts) — toujours adresser les champs par ID, jamais par nom (Christel peut renommer un champ dans Airtable sans que ça casse l'app).

**Piège n°1, le plus important** : toute requête Airtable (lecture ET écriture) doit inclure `returnFieldsByFieldId=true`, sinon l'API répond en indexant par nom de champ et tout devient `undefined`. C'est fait une fois pour toutes dans [src/lib/airtable/client.ts](src/lib/airtable/client.ts) (`listRecords`, `getRecord`, `createRecords`, `updateRecords`, `deleteRecords`) — ne jamais faire un appel Airtable direct qui contourne ce module.

**Piège n°2** : l'API REST Airtable renvoie un champ de liaison (`multipleRecordLinks`) comme un tableau de simples **chaînes d'ID** (`["rec…"]`) ; les objets `{id, name}` vus via l'outil MCP Airtable sont sa mise en forme à lui, pas celle de l'API (erreur d'analyse faite le 11/09, corrigée le 19/09). Le vrai bug du workflow planning (1 106 lignes au lieu de 12 le 19/09, une copie complète recréée toutes les 2 h) : dans le nœud HTTP Request de n8n, **deux paramètres de requête portant le même nom (`fields[]`) s'écrasent** — la liste des jours existants ne contenait donc jamais la date, et la clé de dédoublonnage ne correspondait jamais. Leçons : ne jamais répéter un même nom de paramètre dans ce nœud ; vérifier la sortie réelle d'un nœud via `GET /api/v1/executions/{id}?includeData=true` ; après le premier vrai run d'un workflow qui écrit, compter les lignes créées ; garder le garde-fou (>20 créations = erreur) dans le nœud de calcul.

**Cache** : lecture via `fetch(..., { next: { revalidate: 20, tags: [...] } })` (20s). Écriture → `updateTag()` (API Next 16, remplace `revalidateTag`) pour que l'auteur voie sa propre modification immédiatement ; les autres utilisateurs la voient sous 20s max.

Tables : SITES, SOUS_PROJETS, TACHES, JOURNAL (= "Journal des actions"), CONTACTS, DOCUMENTS, UTILISATEURS, ENTREES_A_VALIDER, DEMANDES, PLANNING_VISITES (ajoutée pour le planning calendrier, section 7 ci-dessous).

## 4. Authentification & RBAC

Pas de mot de passe. Connexion par lien magique (`src/app/login/`, `src/lib/auth/magic-link.ts`, `src/lib/auth/mailer.ts` via SMTP Brevo). Cookie de session (`pena_session`, httpOnly, 30 jours) contient **uniquement l'e-mail** — rôle/site/statut sont toujours relus en direct depuis Airtable UTILISATEURS à chaque requête (`getCurrentUser` dans `src/lib/auth/session.ts`), jamais fait confiance au cookie. Ça veut dire qu'un compte passé à "Suspendu" perd l'accès en moins de 20s (le TTL du cache), pas seulement à la prochaine reconnexion.

`src/proxy.ts` (Edge, ex-`middleware.ts` sous Next 16) : garde légère, vérifie juste qu'un JWT de session valide existe. Toutes les vraies vérifications de rôle/site sont refaites côté serveur dans `(app)/layout.tsx` et dans chaque Server Action (jamais seulement côté UI) — voir `src/lib/auth/rbac.ts` pour les règles centrales (`isAdmin`, `allowedSiteIds`, `canEditTask`, `canAccessSites`, etc.).

Deux rôles : **Admin** (Christel, tous droits, accès "all" sans filtre de site) et **Contributeur** (Cédric Desforges, Sylvie Recrosio — deux sites ; Stéphane Henriet — PENA Environnement seulement). Un Contributeur ne peut librement modifier que les tâches dont il est le Responsable, et ne peut créer un nouveau sous-projet/tâche qu'en passant par une DEMANDE que l'Admin valide.

## 5. Structure de l'app

- `src/app/(app)/` — pages authentifiées : tableau de bord (`page.tsx`), `taches/`, `journal/`, `contacts/`, `demandes/`, `entrees-a-valider/`, `planning/`.
- `src/lib/airtable/*.ts` — un module par table (types + fonctions CRUD), tous passent par `client.ts`.
- `src/lib/data/dossier.ts` — point d'entrée unique `loadDossier(user)` qui charge tout et filtre déjà par périmètre de site de l'utilisateur connecté. **Toute page doit passer par lui**, jamais appeler une fonction `list*` d'un module Airtable directement.
- `src/lib/site-filter.ts` — `filterDossierBySite(dossier, siteId)` : narrows encore le dossier déjà scopé, pour l'onglet de site actuellement sélectionné dans l'UI (`SiteFilterTabs`).

- Rattachement d'une entrée à valider (`entrees-a-valider/`) : `TachePicker` (recherche par mots-clés + filtres site/sous-projet, tâches affichées « Site › Sous-projet ») ou création d'une nouvelle tâche à la validation (`modeTache=nouvelle` dans `validerEntreeAction`, qui appelle `createTache`). `SousProjetSelect` regroupe les sous-projets par site (aussi utilisé par « + Nouvelle tâche »).
- Liste des tâches (`taches/TachesListe.tsx`, composant client) : cases à cocher + barre d'actions groupées (`bulkStatutAction`, `bulkDeplacerAction` dans `taches/actions.ts`). Statut : mêmes droits qu'à l'unité (`canEditTask`, les tâches non autorisées sont ignorées et comptées) ; déplacement vers un sous-projet (« regrouper ») : Admin seulement.
- Planning (`planning/`) : tableau calendrier scrollable horizontalement, refondu le 22/09 (`PlanningCalendrier.tsx`, composant client — colonnes de 132px en `snap-scroll` par semaine ; la constante `LARGEUR_COL` du composant doit rester synchronisée avec la classe Tailwind `w-[132px]`). `page.tsx` calcule la plage de dates côté serveur : lundi de la semaine courante, au moins 8 semaines, étendue jusqu'à la date la plus lointaine ayant un jour sur site ou une échéance, plafonnée à 52 semaines. Remplace l'ancien tableau à 3 colonnes groupé par mois.
- Astuce de test local sans se connecter : lancer `npm run dev`, signer soi-même un cookie `pena_session` (JWT HS256 `{email}` avec `AUTH_SECRET` du `.env`) et récupérer les pages avec `fetch`. Le cache de données Next de développement est persistant et sert la valeur périmée à la 1re requête après expiration : **toujours faire deux requêtes** avant de conclure qu'une donnée manque.

**Piège rencontré deux fois** : ne pas confondre le dossier *déjà filtré par site* (à utiliser pour le contenu affiché) avec le dossier *complet* (à utiliser pour peupler `<SiteFilterTabs sites={...} />`, qui doit toujours voir la liste complète des sites autorisés, sinon les boutons disparaissent dès qu'un site précis est sélectionné — commit `6f865d0`). Pattern correct dans chaque page : `const fullDossier = await loadDossier(user); const dossier = filterDossierBySite(fullDossier, site);` puis `SiteFilterTabs sites={fullDossier.sites}`.

**Piège n°3** : `loadDossier` excluait silencieusement toute entrée de journal sans tâche liée, même pour l'Admin (accès "all") — pertinent pour un Contributeur limité (pas d'info de site sans tâche) mais pas pour l'Admin. Corrigé commit `741a8eb`. Redevenu pertinent avec le workflow email (section 7) qui crée des entrées sans tâche correspondante trouvée.

**Piège n°4** : toute redirection serveur (`NextResponse.redirect(new URL(path, request.url))`) se résout à l'adresse interne du conteneur (`http://0.0.0.0:3000`) plutôt qu'au domaine public une fois derrière Traefik. Toujours construire l'URL de redirection depuis `process.env.APP_URL`, jamais depuis `request.url` — corrigé commit `50320b3` dans `proxy.ts`, `api/auth/callback/route.ts`, `api/auth/logout/route.ts`. **Règle à appliquer systématiquement pour tout nouveau code de redirection.**

## 6. Déploiement

**Pipeline** : push sur `master` du dépôt GitHub privé `https://github.com/Christel-CDL/PENA-suivi-app` → GitHub Actions (`.github/workflows/docker-publish.yml`) construit l'image Docker et la publie sur `ghcr.io/christel-cdl/pena-suivi-app:latest` (paquet **public** par choix de Christel, pour simplifier — aucune donnée/secret dans l'image, tout est en variables d'environnement) → le VPS Hostinger (projet Docker Compose `root`, partagé avec n8n et Traefik) télécharge cette image et la sert derrière Traefik/HTTPS.

App en ligne : **https://suivi-pena.srv1102696.hstgr.cloud** (VM Hostinger id `1102696`, host `srv1102696.hstgr.cloud`). Référence du compose complet : [deploy/docker-compose.root.yml](deploy/docker-compose.root.yml). `Dockerfile` = build multi-stage standard `output: "standalone"` (voir `next.config.ts`).

**Important : je (Claude) ne peux exécuter ni `git push` ni la mise à jour du projet Docker Compose sur le VPS moi-même** — ces deux actions sont bloquées par le classifieur de sécurité de l'environnement, même après confirmation explicite de l'utilisatrice, et je ne peux pas non plus m'auto-accorder cette permission. Pour toute nouvelle fonctionnalité :
1. Je committe le code localement.
2. Je donne à Christel la commande `git push` à coller dans un terminal **PowerShell** (pas Bash — attention à la syntaxe, `&&`/`grep`/`cut` ne fonctionnent pas telles quelles ; utiliser `;` et `Where-Object`/`Select-String`).
3. Elle vérifie la coche verte sur `/actions` du repo GitHub (build ~1 min).
4. Elle clique sur **Deploy** dans hPanel → VPS → Docker → projet **root** (**après** la coche verte — cliquer trop tôt récupère l'image précédente, piège rencontré plusieurs fois).

Piège Hostinger : son moteur de déploiement sait uniquement **télécharger une image déjà construite** (`image:` dans le compose), jamais **construire depuis un contexte Git** (`build: <url>` échoue avec "No such image"). Toujours `image: ghcr.io/...`, jamais `build:`, dans le compose de ce VPS.

Ne jamais faire confiance à un "fait"/"c'est fait" verbal de Christel sur une étape de déploiement sans le vérifier (via les logs si l'outil Hostinger est connecté, sinon en lui demandant une capture d'écran de l'onglet Journaux de hPanel) — plusieurs fois dans la session précédente, l'étape réellement effectuée n'était pas celle attendue.

## 7. Automatisations n8n

n8n self-hosted sur le même VPS (`https://n8n.srv1102696.hstgr.cloud`), dans le même projet Docker Compose `root`. Accès API public via clé (`X-N8N-API-KEY`) — l'API ne permet pas de lister/lire les credentials existants (405 sur GET, sécurité voulue), seulement de les créer/supprimer, et elle ne permet pas non plus de "tester" un nœud à distance. Les workflows, eux, ont un CRUD complet via l'API (`GET/POST/PUT /api/v1/workflows/{id}`, `POST .../activate`).

Référence complète de chaque workflow (JSON exporté, à repousser via l'API à chaque modification) : [deploy/n8n-workflow-ingestion-email.json](deploy/n8n-workflow-ingestion-email.json) et [deploy/n8n-workflow-planning-calendrier.json](deploy/n8n-workflow-planning-calendrier.json).

### 7.1 "PENA - Ingestion e-mails" (id `FY7p9fh2KWcGRng9`)

Actif, cron `*/15 8-20 * * 1-5` (toutes les 15 min, jours ouvrés 8h-20h). Lit les e-mails Outlook de christel.lacome@cdl-expertises.com (Microsoft Graph, `Mail.Read`), filtre (domaine `@groupepena.fr` en to/cc/from OU mot-clé "pena" dans objet/corps, à l'exclusion du domaine `isanetfact.facturation.io` = logiciel de facturation CDL), résume chaque e-mail pertinent avec Claude (Haiku 4.5, clé Anthropic en credential Header Auth n8n), écrit le résultat dans ENTREES_A_VALIDER (statut "À valider") — **jamais directement dans JOURNAL**, conformément au cahier des charges. Christel valide ou rejette manuellement chaque entrée dans l'onglet "Entrées à valider" de l'app.

### 7.2 "PENA - Sync planning calendrier" (id `yoHd0liyuV9rnhkw`)

Actif, toutes les 2h. Lit le calendrier Outlook de Christel sur les 2 prochains mois (Graph `calendarView`), ne retient que les événements dont le titre contient **"Journée"** (ex. "Journée PENA") — un rendez-vous ponctuel qui mentionne juste "PENA" dans son titre est ignoré, décision explicite de Christel (ces rendez-vous ponctuels devraient un jour devenir des actions de journal liées à une tâche — fonctionnalité **non construite**, voir section 9). Convention de code de site dans le titre : `PM` ou `PENA` seul → PENA Métaux (`recagFquBCz04FJfi`), `PE` → PENA Environnement (`recA9nSrxiyq1Ta9x`), `PL` (PENA Logistic / plateforme Anjalby) → aussi PENA Métaux, rattaché à son réseau. Écrit dans la nouvelle table PLANNING_VISITES (dédoublonnage par date+site, comparé aux enregistrements déjà présents — voir piège n°2 ci-dessus : ce dédoublonnage a été réellement cassé du 11 au 19/09, corrigé et vérifié à blanc sur données réelles le 19/09 ; vérifié le 20/09 : la table reste à 12 lignes après une journée de cycles).

Credential Microsoft utilisé par les deux workflows : générique **"OAuth2 API"** (nom affiché dans n8n : "Outlook+calendar/N8N", credential id `efq8lJNnVLjQJtil`), **pas** le credential natif "Microsoft Outlook OAuth2 API" de n8n — celui-ci est câblé en dur sur l'endpoint `/common` (multi-tenant), incompatible avec l'inscription Azure AD mono-tenant "n8n PENA" (choix de sécurité voulu). Authorization/Token URL pointent explicitement sur `https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/{authorize,token}`. Conséquence : impossible d'utiliser les nœuds natifs "Microsoft Outlook"/"Microsoft Outlook Calendar" (qui exigent leur credential dédié) — tout passe par des nœuds HTTP Request génériques appelant directement l'API Microsoft Graph.

## 8. RGPD / confidentialité — règles à ne jamais enfreindre

- Le résumé d'e-mail généré par Claude doit être factuel et court, jamais une recopie du texte brut de l'e-mail, jamais de donnée de facturation CDL, jamais de donnée de santé d'un tiers.
- Aucune donnée n'entre dans le vrai Journal sans validation humaine explicite (Admin).
- Le calendrier de Christel contient d'autres clients que PENA — le filtre par mot-clé "Journée" + code de site existe précisément pour ne jamais exposer un rendez-vous non-PENA.
- Image Docker publique = OK (aucune donnée dedans), mais le dépôt GitHub source, lui, reste privé.

## 9. État au 20/09/2026 — ce qui reste à faire

**En production et validé par Christel** : tout ce qui précède, plus (depuis le 18/09) : recherche de tâche par mots-clés + création de tâche dans « Entrées à valider » ; liste des tâches avec sélection multiple (changement de statut en lot, déplacement vers un sous-projet existant, « regrouper » = créer un nouveau sous-projet et y ranger les tâches cochées) ; tâches terminées/annulées **masquées par défaut** (filtre de statut : « Tâches en cours de suivi » / « Tous » / un statut précis) ; bouton « + Nouveau sous-projet » ; suppression d'une tâche (fiche tâche, Admin, confirmation en deux temps, les entrées de journal liées sont conservées détachées) ; QR code de l'app (`deploy/QR-Suivi-ICPE-PENA.png`, généré localement puis relu avec un décodeur). Le sync planning corrigé du 19/09 tient : 12 lignes stables dans PLANNING_VISITES le 20/09.

**À faire / à demander** :
- **Demander à Christel le retour du test avec l'équipe PENA** (Cédric Desforges notamment, prévu le 14/09, jamais reporté ici) avant de repartir sur de nouvelles fonctionnalités : il aura probablement priorité.
- Non testé en conditions réelles : changement de statut en lot par un **Contributeur** (la règle `canEditTask` est appliquée côté serveur, mais seul le compte Admin a été essayé).
- Fonctionnalité évoquée mais **non spécifiée** : transformer les rendez-vous ponctuels du calendrier (ignorés par le sync planning) en actions de journal liées à une tâche. Proche du sujet mis en pause (analyse IA des commentaires de journal) — **ne pas construire sans que Christel relance explicitement le sujet**.
- Un sous-projet vide n'apparaît pas dans la liste des tâches (elle ne groupe que les sous-projets ayant des tâches) mais est proposé dans « + Nouvelle tâche » ; à revoir si Christel s'en étonne.
- Le connecteur Hostinger de Claude s'est plusieurs fois retrouvé « invalidé » (expiration du jeton côté Hostinger, pas réparable par une bascule on/off) : Christel doit le reconnecter depuis les réglages Connecteurs de son compte Claude. En son absence, demander une capture de l'onglet Journaux de hPanel.

**Conventions de travail** :
- Tests locaux : `npm run dev` lit et **écrit dans la vraie base Airtable**. Créer les données de test avec le préfixe « ZZ TEST », les supprimer ensuite (tâche, sous-projet, entrée de journal…) et le vérifier. Arrêter le serveur de dev **par son port** (`netstat -ano | grep :3000` puis `taskkill //PID <pid> //F`), jamais `taskkill /IM node.exe`, qui tue tous les processus Node de la machine.
- Piloter l'interface dans le navigateur intégré avec un cookie de session signé (voir « Astuce de test local » plus haut) : le clic par coordonnées est peu fiable en viewport émulé, préférer les références d'éléments ou le JS de la page.
- Aucun secret n'est committé (`.env` gitignored) — les clés (Airtable, Anthropic, n8n, Entra/Azure AD, GitHub PAT) vivent dans le `.env` local de Christel.
- Écrire du texte contenant des accents graves (`) ou des `$` via `node -e "…"` dans le shell Bash **exécute** ces passages : passer par l'outil d'édition/écriture de fichiers.
