# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Application de suivi de dossier ICPE pour deux sites clients (PENA Métaux, PENA Environnement), utilisée par une non-développeuse (Christel, Admin) et quelques contributeurs. Le code, les commentaires et les messages de commit sont en français. Détail complet, IDs et historique des bugs : [NOTES-TECHNIQUES.md](NOTES-TECHNIQUES.md) (lire en premier pour toute reprise) ; usage côté Christel : [GUIDE.md](GUIDE.md).

## Commandes

- `npm run dev` — serveur local (port 3000). Copier `.env.example` en `.env` d'abord.
- `npx next build` puis `npx eslint . --max-warnings=0` — doivent passer proprement avant chaque commit (convention du projet). Il n'y a **pas de suite de tests**.
- Shell : le terminal de Christel est **PowerShell** (pas Bash : pas de `&&`, `grep`, `cut`) ; l'outil Bash de Claude est Git Bash.

## Architecture (vue d'ensemble)

- **Airtable est la seule source de vérité**, aucune base propre à l'app (base `app6sehe4hMHO1NXe`). Tout accès passe par `src/lib/airtable/client.ts`, qui force `returnFieldsByFieldId=true` (sans ça, tous les champs sont `undefined`) ; les champs s'adressent par **ID** (`constants.ts`), jamais par nom. Lectures cachées 20 s, écritures suivies de `updateTag()` (Next 16).
- **Une page ne lit jamais une table directement** : elle appelle `loadDossier(user)` (`src/lib/data/dossier.ts`) qui charge tout et applique le périmètre de site de l'utilisateur, puis `filterDossierBySite()` pour l'onglet de site sélectionné. Pour `<SiteFilterTabs>`, passer la liste des sites du dossier **non filtré par onglet** (`fullDossier.sites`), sinon les boutons disparaissent.
- **Auth par lien magique**, sans mot de passe. Le cookie de session ne contient que l'e-mail : rôle, site et statut sont relus en direct dans Airtable à chaque requête. `src/proxy.ts` ne fait qu'une garde légère ; les vraies règles (Admin / Contributeur, par site et par action) sont dans `src/lib/auth/rbac.ts` et **doivent être revérifiées dans chaque Server Action**, jamais seulement masquées dans l'UI.
- **Toute URL de redirection serveur se construit depuis `process.env.APP_URL`**, jamais depuis `request.url` (derrière Traefik il vaut `http://0.0.0.0:3000`).
- Mutations : Server Actions + `useActionState`. Un panneau d'édition qui doit se fermer après succès utilise le motif « état dérivé pendant le rendu » (comparer l'objet d'état à une copie `useState`), pas un `useEffect` — la règle ESLint `react-hooks/set-state-in-effect` l'interdit. Les formulaires à champs non contrôlés (`defaultValue`) reçoivent un `key={JSON.stringify(donnees)}` pour se remonter quand les données Airtable changent. Ne jamais imbriquer des `<form>`, ni mettre plusieurs contrôles cliquables dans un même `<label>` (le clic est relayé au premier).

## Déploiement — ce que Claude ne peut pas faire

Pipeline : push `master` → GitHub Actions construit l'image `ghcr.io/christel-cdl/pena-suivi-app:latest` → hPanel (Hostinger) « Deploy » du projet `root` (Traefik + n8n + app, voir `deploy/docker-compose.root.yml`). `git push` et l'écriture sur le VPS sont **bloqués pour Claude** : committer localement, puis donner à Christel la commande PowerShell à lancer, et lui dire d'attendre la **coche verte** de `/actions` avant de cliquer sur Deploy (sinon l'ancienne image est redéployée). Hostinger ne sait que tirer une image (`image:`), jamais construire (`build:`). Vérifier un « c'est fait » verbal par les logs ou une capture d'écran.

## n8n

Deux workflows actifs (`deploy/n8n-workflow-*.json`, source de vérité repoussée via l'API `PUT /api/v1/workflows/{id}` ; **un PUT efface tout credential absent du JSON**). L'API ne permet pas de lister les credentials. Le nœud HTTP Request écrase les paramètres de requête de même nom (ex. `fields[]`) — cause d'un bug de doublons en production ; inspecter les sorties réelles avec `GET /api/v1/executions/{id}?includeData=true`. Valeurs de champs à choix unique Airtable : correspondance exacte, accents compris (`À valider`). Les clés (Airtable, Anthropic, n8n, Entra, GitHub) sont dans le `.env` local, jamais dans Git.
