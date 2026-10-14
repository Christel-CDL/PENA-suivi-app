# Guide d'utilisation — Suivi ICPE PENA

Ce guide s'adresse à Christel (administratrice de l'application). Il couvre l'usage quotidien (pilotage, comptes-rendus) et les opérations d'administration.

**Version 2 (octobre 2026)** : chaque sujet ouvert dit « où on en est » en trois champs — **Prochaine étape**, **Balle chez** (Christel, PENA, Prestataire ou Administration) et **Prochain point** (date). Ils sont obligatoires sur tout sujet qui n'est ni « Terminé » ni « Annulée ». Les sujets sont rangés par **volet** (`PM · …` pour PENA Métaux, `PE · …` pour PENA Environnement).

## A. Les 4 vues de pilotage (page d'accueil)

Le tableau de bord affiche quatre tuiles. Un clic sur une tuile affiche la liste correspondante, triée par prochain point (le plus proche en premier), avec le volet, la prochaine étape et le responsable de chaque sujet.

| Vue | Pour vous (Admin) | Pour un Contributeur (ex. Cédric) |
|---|---|---|
| **À moi** | la balle est chez Christel | ses sujets où la balle est chez PENA |
| **J'attends** | la balle est chez PENA, un prestataire ou l'administration | ses sujets où la balle est chez Christel, un prestataire ou l'administration |
| **En retard** | prochain point dépassé | idem, sur ses sites |
| **Cette semaine** | prochain point dans les 7 prochains jours | idem, sur ses sites |

« Ses sujets » = ceux dont il est le **Responsable**. Les onglets de site (Tous les sites / PENA METAUX / …) filtrent aussi ces vues. Le chiffre « En retard » passe en rouge dès qu'un sujet l'est.

**Routine conseillée** : chaque matin, « En retard » puis « Cette semaine » ; après chaque échange, mettre à jour la prochaine étape et la balle (fiche du sujet, ou en même temps qu'un compte-rendu).

## B. Saisir un compte-rendu ou une action

Bouton **« + Compte-rendu / action »** en haut de chaque page, ou **« + Compte-rendu / action sur ce sujet »** dans une fiche (le sujet est alors déjà choisi).

1. **Date et heure** — maintenant par défaut ; modifiable pour une visite de la veille.
2. **Type** — Visite terrain, Réunion / Entretien, Point dossier (appel, point téléphonique) ou Autre.
3. **Volet**, puis **Sujet** — deux listes successives (seuls les sujets ouverts sont proposés).
4. **Participants** (facultatif) — tapez quelques lettres du nom, cliquez ; recommencez pour en ajouter.
5. **Compte-rendu** — texte libre, factuel (pas de donnée de facturation ni de santé d'un tiers).
6. **Lien vers un document** (facultatif) — lien OneDrive ou lien du rapport de constat, commençant par `https://`. **Aucun fichier n'est stocké** dans l'application.
7. **Mettre à jour le sujet en même temps** (case facultative) — ouvre la prochaine étape, la balle, le prochain point et le statut, préremplis avec les valeurs actuelles : modifiez ce qui a changé.
8. **Enregistrer** — le message vert « Enregistré » n'apparaît qu'une fois Airtable a confirmé. En cas d'erreur (message rouge), votre texte reste à l'écran : corrigez et réenregistrez.

Les Contributeurs peuvent aussi saisir un compte-rendu sur tout sujet de leurs sites ; la case « Mettre à jour le sujet » ne leur est proposée que sur les sujets dont ils sont responsables. Celui qui saisit est enregistré comme auteur (champ « Contact associé ») ; les présents vont dans le champ « Participants ».

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
- **Accepter** — crée directement le sous-projet ou la tâche demandée. Pour une nouvelle tâche, « Accepter… » ouvre d'abord les trois champs de pilotage à remplir (un sujet naît ouvert).
- **Refuser** — clôt la demande sans rien créer.

## 3. Valider une entrée automatique (e-mails)

Onglet **Entrées à valider** (Admin uniquement). C'est ici qu'arrivent les résumés d'e-mails générés automatiquement par le workflow n8n — jamais directement dans le vrai journal. Pour chaque entrée, vous pouvez relire et corriger le texte avant de la valider (elle apparaît alors dans le journal des actions) ou la rejeter.

Ce que fait n8n (depuis le 14/10/2026) : toutes les 15 minutes, il lit les nouveaux mails liés à PENA, **ignore ceux déjà traités** (même mail présent dans la boîte de réception et dans les éléments envoyés), **regroupe les mails d'un même fil** en une seule entrée et, si une entrée du même fil attend encore votre validation, **la complète** au lieu d'en créer une nouvelle. Il **suggère le sujet existant** le plus probable (contact lié au sujet, puis mots-clés du nom et de la prochaine étape) ; il ne propose jamais de créer un sujet.

Pour rattacher l'entrée :
- **Sujet existant** (cas normal) : le sujet suggéré est déjà choisi ; sinon filtrez par site et/ou volet, ou tapez des mots-clés. Les sujets terminés ou annulés ne sont pas proposés. Sans choix, l'entrée est publiée sans sujet.
- **Mettre à jour le sujet en même temps** : comme pour un compte-rendu, la case ouvre prochaine étape, balle, prochain point et statut, préremplis.
- **Aucun sujet ne convient** : petit lien gris « Créer un nouveau sujet » sous le choix du sujet — nom, volet et les trois champs de pilotage.

À la validation, le journal reprend la **date du mail** (et non celle du clic). Si une entrée contient des **« Actions demandées »** (encadré orange, prévu pour les futurs rapports de constat), elles sont à traiter par vous : rien n'est jamais envoyé automatiquement.

## 4. Redéployer une nouvelle version de l'application

Le code source est sur un dépôt GitHub privé (`Christel-CDL/PENA-suivi-app`). Claude prépare et envoie le code, mais **deux actions restent à faire par vous** (des restrictions de sécurité empêchent Claude de les faire lui-même) :

1. **Envoyer le code** : Claude vous donnera une commande `git push` à coller dans un terminal PowerShell sur votre PC.
2. **Redéployer sur le serveur** : dans hPanel → VPS → Docker → projet **root** → bouton **Deploy/Déployer**. Cela télécharge la nouvelle version de l'image (construite automatiquement par GitHub Actions dès que le code est envoyé, ça prend 2-3 minutes) et redémarre `pena-app` — n8n et Traefik ne sont normalement pas affectés tant que leur configuration ne change pas.

En cas de doute, demandez à Claude de vous guider étape par étape — il peut vérifier les journaux de déploiement (lecture seule) même s'il ne peut pas cliquer sur "Déployer" à votre place.

## 5. Gérer les sujets et les volets (onglet Tâches, Admin)

- **Liste par volet** : chaque volet est une section avec son compteur (« 9 ouverts · 4 terminés ») ; cliquez sur son titre (▾/▸) pour la replier. Le volet de veille (« PM · Autres sujets (en veille) ») est en dernier, replié. Chaque sujet affiche sa balle, sa prochaine étape et son prochain point (en rouge s'il est dépassé).
- **Sujets terminés** : masqués par défaut ; cochez « Afficher les terminés » puis « Filtrer ».
- **Fiche d'un sujet** : l'encadré du haut résume prochaine étape, balle et prochain point. On les modifie dans le formulaire de la fiche (vous, ou le responsable du sujet). Un sujet ouvert ne peut pas être enregistré si l'un des trois est vide — le message dit lequel ; pour clore un sujet, passez-le à « Terminé » ou « Annulée » (les trois champs ne sont alors plus exigés).
- **Nouvelle tâche** : bouton « + Nouvelle tâche ». Les volets sont proposés groupés par site ; les trois champs de pilotage sont demandés.
- **Nouveau volet** : bouton « + Nouveau sous-projet » (nom, site, description facultative). Le site est celui choisi ici (champ « Projet associé ») : le préfixe `PM ·` / `PE ·` du nom ne sert qu'à l'affichage, pensez quand même à le mettre pour la lisibilité.
- **Actions en lot** : cochez une ou plusieurs tâches (ou toutes celles d'un sous-projet avec la case de son titre). Une barre d'actions apparaît :
  - « Changer le statut… » puis « Appliquer » ;
  - « Déplacer vers ce sous-projet » (sous-projet existant) ;
  - « Regrouper dans un nouveau sous-projet » : crée le sous-projet (nom + site, préselectionné d'après les tâches cochées) et y range les tâches, même une seule.
- **Supprimer une tâche** : bouton « Supprimer cette tâche » en bas de sa fiche, avec confirmation. C'est définitif ; les entrées de journal liées sont conservées mais ne sont plus rattachées à aucune tâche.

Les Contributeurs ne peuvent changer en lot que le statut des tâches dont ils sont responsables ; déplacer, regrouper, créer et supprimer sont réservés à l'Admin.

## 6. Ouvrir l'application sur un téléphone

Scannez le QR code (fichier `deploy/QR-Suivi-ICPE-PENA.png` dans le dossier du projet) ou ouvrez `https://suivi-pena.srv1102696.hstgr.cloud`. Chaque appareil se connecte une première fois par lien magique ; la session dure ensuite 30 jours (ou jusqu'à « Déconnexion »). Si le lien ouvert depuis une application de messagerie ramène à la page de connexion, copiez-le dans Safari ou Chrome. « Ajouter à l'écran d'accueil » crée un raccourci.

## 7. Surveiller que le workflow n8n tourne toujours

1. Connectez-vous à `https://n8n.srv1102696.hstgr.cloud`.
2. Dans la liste des workflows, repérez celui dédié à PENA et vérifiez que l'interrupteur en haut à droite est bien sur **Active** (vert). S'il est gris, le workflow ne s'exécute plus.
3. Onglet **Executions** du workflow : historique des exécutions. Une icône rouge signale un échec — cliquez dessus pour voir le détail de l'erreur. Un échec « Garde-fou » signifie que plus de 20 fils seraient arrivés d'un coup : rien n'a été écrit, demandez à Claude de regarder.

**Attention au bouton « Publier » de n8n** : n8n distingue la version *publiée* (celle qui tourne) d'un *brouillon*. Ne publiez pas une modification faite à la main dans l'éditeur sans l'avoir fait vérifier — c'est ainsi qu'un brouillon du 15/09 avait perdu les filtres de lecture des mails (il n'a heureusement jamais été publié). La référence du workflow est dans le dépôt (`deploy/n8n-workflow-ingestion-email.json`, construit par `deploy/n8n-ingestion/construit-workflow.mjs`).
