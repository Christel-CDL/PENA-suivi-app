# Guide d'utilisation — Suivi ICPE PENA

Ce guide s'adresse à Christel (administratrice de l'application). Il couvre les opérations courantes qui ne se font pas depuis l'interface de l'application elle-même.

## 1. Gérer les utilisateurs

Les comptes se gèrent directement dans Airtable, dans la base **Suivi ICPE Environnement**, table **UTILISATEURS**. Il n'y a pas d'écran dédié dans l'application — c'est volontaire, pour garder un seul endroit où gérer les accès.

### Ajouter un utilisateur
Créez une nouvelle ligne dans UTILISATEURS avec :
- **Nom**
- **Email** — doit être exact, c'est l'adresse qui recevra le lien de connexion (aucun mot de passe)
- **Rôle** — `Admin` ou `Contributeur`
- **Sites autorisés** — les sites auxquels la personne a accès. Pour un Contributeur limité à un seul site (ex. Stéphane sur PENA Environnement), ne cochez que ce site.
- **Contact lié** — si possible, liez la ligne au contact correspondant dans la table CONTACTS, pour que ses entrées de journal soient bien attribuées.
- **Statut** — `Actif`

La personne pourra se connecter dès la prochaine tentative (lien magique envoyé par e-mail, pas de mot de passe à créer).

### Retirer un accès
Ne supprimez pas la ligne — passez son **Statut** sur `Suspendu`. C'est pris en compte en moins de 20 secondes (l'application revérifie ce statut à chaque page, pas seulement à la connexion), donc pas besoin d'attendre que la personne se déconnecte.

### Changer le périmètre d'un utilisateur
Modifiez simplement le champ **Sites autorisés** sur sa ligne dans UTILISATEURS.

## 2. Traiter une demande en attente

Onglet **Demandes** de l'application (visible pour vous en tant qu'Admin). Un Contributeur y dépose une demande lorsqu'il veut qu'un nouveau sous-projet ou une nouvelle tâche soit créé, mais qu'il n'a pas le droit de le faire lui-même.

Chaque demande avec le statut `En attente` affiche deux boutons :
- **Accepter** — crée directement le sous-projet ou la tâche demandée.
- **Refuser** — clôt la demande sans rien créer.

## 3. Valider une entrée automatique (e-mails)

Onglet **Entrées à valider** (Admin uniquement). C'est ici qu'arrivent les résumés d'e-mails générés automatiquement par le workflow n8n — jamais directement dans le vrai journal. Pour chaque entrée, vous pouvez relire et corriger le texte avant de la valider (elle apparaît alors dans le journal des actions) ou la rejeter.

## 4. Redéployer une nouvelle version de l'application

Le code source est sur un dépôt GitHub privé (`Christel-CDL/PENA-suivi-app`). Claude prépare et envoie le code, mais **deux actions restent à faire par vous** (des restrictions de sécurité empêchent Claude de les faire lui-même) :

1. **Envoyer le code** : Claude vous donnera une commande `git push` à coller dans un terminal PowerShell sur votre PC.
2. **Redéployer sur le serveur** : dans hPanel → VPS → Docker → projet **root** → bouton **Deploy/Déployer**. Cela télécharge la nouvelle version de l'image (construite automatiquement par GitHub Actions dès que le code est envoyé, ça prend 2-3 minutes) et redémarre `pena-app` — n8n et Traefik ne sont normalement pas affectés tant que leur configuration ne change pas.

En cas de doute, demandez à Claude de vous guider étape par étape — il peut vérifier les journaux de déploiement (lecture seule) même s'il ne peut pas cliquer sur "Déployer" à votre place.

## 5. Surveiller que le workflow n8n tourne toujours

1. Connectez-vous à `https://n8n.srv1102696.hstgr.cloud`.
2. Dans la liste des workflows, repérez celui dédié à PENA et vérifiez que l'interrupteur en haut à droite est bien sur **Active** (vert). S'il est gris, le workflow ne s'exécute plus.
3. Onglet **Executions** du workflow : historique des exécutions. Une icône rouge signale un échec — cliquez dessus pour voir le détail de l'erreur.
