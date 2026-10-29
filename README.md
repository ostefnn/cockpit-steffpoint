# Cockpit SteffPoint

Page d'accueil personnelle pour Safari (et tout navigateur) : horloge, météo, recherche et favoris rangés par blocs, avec des environnements DEV / TEST / PROD et des tenants Microsoft 365 pour ceux qui en gèrent.

Un seul fichier `index.html`, sans dépendance ni serveur. Inspiré de [Bonjourr](https://bonjourr.fr).

**En ligne : https://ostefnn.github.io/cockpit-steffpoint/**

## Vidéo de présentation

[![Lire le teaser de Cockpit SteffPoint (34 secondes, vidéo MP4)](media/teaser-poster.jpg)](https://ostefnn.github.io/cockpit-steffpoint/media/Teaser_LinkedIn_Cockpit_SteffPoint_musique.mp4)

[Lire la vidéo (MP4, 34 s, 11 Mo)](https://ostefnn.github.io/cockpit-steffpoint/Teaser_LinkedIn_Cockpit_SteffPoint_musique.mp4) · musique seule, sans voix ni dialogue · tout le texte est à l'écran et repris ci-dessous.

<details>
<summary>Description textuelle de la vidéo</summary>

1. **0:00** – Sur fond sombre, des noms d'outils apparaissent en rafale : Microsoft 365, SharePoint, Teams, Azure, GitHub, Power Platform. Texte : « Encore un lien à retrouver ? »
2. **0:03** – La page Cockpit SteffPoint s'affiche : heure, salutation « Bonjour », barre de recherche, onglets Pro / Perso et blocs de favoris. Texte : « Et si tout commençait ici ? », puis « Cockpit SteffPoint ».
3. **0:06** – Le curseur tape « SharePoint » dans la recherche et les favoris se filtrent en direct. Texte : « Trouve. », puis « Lance. »
4. **0:10** – Passage de l'espace Pro à l'espace Perso : les blocs changent. Texte : « Ton contexte. », puis « Tes accès. »
5. **0:13** – Le sélecteur passe de DEV à TEST puis PROD : les favoris prennent un badge de couleur et changent d'adresse. Texte : « Le bon environnement. », puis « Au bon moment. »
6. **0:19** – Le sélecteur de tenant passe de « Tenant A » à « Tenant B » et les liens SharePoint suivent. Texte : « Change de tenant. », puis « Pas tes habitudes. »
7. **0:23** – Le panneau Réglages s'ouvre et la page passe en thème sombre. Texte : « Ton cockpit. », puis « À ta façon. »
8. **0:27** – Vue d'ensemble de la page. Texte : « COCKPIT STEFFPOINT », « Ton web. Ton espace. Ton cockpit. », « Ce n'est que le début. »
9. **0:32** – Logo et texte final : « Cockpit SteffPoint – Envie de voir la suite ? »

</details>

## Fonctionnalités

- **Assistant de démarrage** : à la première ouverture, 6 étapes pour choisir prénom, espaces, blocs prêts à l'emploi (Microsoft 365, Office, SharePoint, Tâches, Power Platform, GitHub) ou import de signets, disposition, fond, météo et moteur de recherche. Relançable depuis les réglages, sans rien supprimer.
- **Accueil** : horloge, date, salutation, météo ([Open-Meteo](https://open-meteo.com), sans clé).
- **Dispositions** : Classique (grande horloge, par défaut), Accueil (grande salutation et liens fréquents), Cockpit (colonne d'infos à gauche, tout tient à l'écran) ou Lanceur (grande recherche et tuiles d'icônes).
- **Fond** : photo floutée qui change à chaque onglet, chaque heure ou chaque jour ([Picsum](https://picsum.photos)), dégradé, couleur unie, image par URL ou photo locale. Flou, luminosité et voile réglables (voile d'au moins 20 % sur une photo pour garder le texte lisible).
- **Recherche unifiée** : filtre les favoris en direct, Entrée ouvre le premier résultat, sinon lance une recherche web (Bing, Google, DuckDuckGo, Ecosia).
- **Palette de commandes** (`⌘K` / `Ctrl K`) : liens et actions (espace, tenant, environnement, nouveau bloc, thème, ménage…), recherche tolérante (« shrpt » trouve SharePoint). `@contoso` et `!test` ouvrent un lien pour un autre tenant ou environnement, sans changer ceux de la page.
- **Blocs de favoris** : couleur, liste ou grille d'icônes, repli, « Afficher plus » au-delà de N liens, glisser-déposer, ajout par collage d'URL. Quand tous les liens d'un bloc sont sur le même domaine, celui-ci s'affiche une seule fois dans l'en-tête.
- **Icônes** : favicon demandé au site lui-même (fonctionne aussi pour les sites internes), puis à Google pour les sites publics seulement, sinon initiales. Une icône personnalisée par lien est possible.
- **Partage** : menu ⋯ d'un bloc → Partager. Un lien qui contient le bloc (ou tout l'espace) après le `#`, sans serveur, que le destinataire importe dans l'espace de son choix.
- **Blocs abonnés** : un fichier JSON publié (GitHub Pages, Gist « Raw »…) auquel chacun s'abonne via **+ Nouveau bloc → S'abonner à une adresse**. Mis à jour toutes les 6 heures, en lecture seule, désabonnement possible en gardant une copie.
- **Ménage** : doublons, blocs vides, et liens jamais ou plus ouverts (après deux mois de suivi), calculé dans le navigateur, chaque suppression annulable.
- **Liens fréquents** : les 6 liens les plus ouverts, en dispositions Accueil et Cockpit, avec `⌥1`–`⌥6`.
- **Édition rapide** : en mode édition, le ✕ d'un lien le supprime tout de suite, avec annulation.
- **Espaces** (Pro / Perso…) avec bascule automatique le week-end, et en option selon des heures de travail (ex. Pro de 8 h à 18 h, Perso le soir).
- **Environnements** : chaque favori peut avoir une adresse DEV et TEST en plus de l'adresse principale (PROD). Hors PROD, la capsule s'entoure d'un liseré et le titre de l'onglet est préfixé `[DEV]` ou `[TEST]`.
- **Tenants** (facultatif) : dans une adresse, `{tenant}` et `{domain}` sont remplacés par le tenant choisi. Rien n'apparaît tant qu'aucun lien n'en utilise.
- **Administration Microsoft 365** (facultatif, coupé par défaut) : ajoute un espace « Admin O365 » avec un bloc par domaine (administration, collaboration, Power Platform, sécurité, appareils, mon compte).
- **Réglages** façon Bonjourr, thème clair / sombre / système.
- **Sauvegarde** : export / import JSON, import des signets Safari, rappel d'export.
- **Accessibilité** : vise le niveau WCAG 2.2 AA. Raccourcis à une touche désactivables, alternative au glisser-déposer, contrastes vérifiés avec axe-core. La vidéo de présentation ne se lance pas toute seule et a une description textuelle complète.

## Installation dans Safari

**Version en ligne (recommandée)**

1. Safari → Réglages → Général → **Page d'accueil** : `https://ostefnn.github.io/cockpit-steffpoint/`.
2. Choisir « Page d'accueil » pour les nouvelles fenêtres et les nouveaux onglets.

**Version locale** (fonctionne hors ligne, sauf météo, photos, favicons et polices)

```bash
git clone https://github.com/ostefnn/cockpit-steffpoint.git
```

Puis mettre `file:///chemin/vers/cockpit-steffpoint/index.html` comme page d'accueil.

## Publier sa propre copie

1. Forker le dépôt.
2. Settings → Pages → Source : **Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. La page est servie sur `https://<utilisateur>.github.io/cockpit-steffpoint/`.

> Le site GitHub Pages est **public**. Le fichier ne contient que des exemples génériques : tes favoris restent dans ton navigateur. Ne commite jamais un export JSON ni des adresses internes.

## Où sont mes données ?

Dans le stockage local (`localStorage`) du navigateur, pour l'adresse de la page. Rien n'est envoyé à un serveur.

- Elles restent d'une visite à l'autre, y compris après une mise à jour du code.
- Elles ne suivent pas d'une adresse à l'autre (fichier local ↔ GitHub Pages), ni d'un Mac à l'autre : utilise **Réglages → Sauvegarde → Exporter**, puis **Importer**.
- Effacer les données de sites web dans Safari les supprime : exporte régulièrement (la page te le rappelle après 14 jours).
- Le compte des liens fréquents reste dans ce navigateur.
- À l'import, les liens dont l'adresse n'est pas en `http`, `https`, `file`, `mailto` ou `ftp` (par exemple `javascript:`) sont écartés.

Services externes appelés : Open-Meteo (météo), Picsum (photos), Google Fonts, et pour les favicons le site du lien puis Google en secours. Les adresses internes (sans point, `.local`, `.corp`, `.lan`, IP privées…) ne sont jamais envoyées à Google. Pour ne rien envoyer du tout à Google, choisis Réglages → Favoris → Icônes → Initiales. Un bloc abonné interroge en plus l'adresse de son fichier source.

- Un lien de partage contient les adresses du bloc dans le fragment `#` : il ne passe par aucun serveur, mais toute personne qui le reçoit les voit.
- Un import (JSON, lien de partage, fichier d'abonnement) écarte toujours les liens dont le schéma n'est pas autorisé.

## Raccourcis

| Touche | Action |
| --- | --- |
| `⌘K` / `Ctrl K` | Palette de commandes |
| `/` | Rechercher |
| `↑` `↓`, `Entrée` | Choisir et ouvrir un résultat (`⌘ Entrée` : nouvel onglet, `Maj Entrée` : recherche web) |
| `⌥1`–`⌥6` | Ouvrir un lien fréquent (dispositions Accueil et Cockpit) |
| `E` | Mode édition |
| `,` | Réglages |
| `?` | Aide |
| `1`–`9` | Changer d'espace |
| `T` | Tenant suivant |
| `V` | Environnement suivant |
| `Échap` | Fermer / vider |

Les raccourcis à une touche se désactivent dans **Réglages → Général → Raccourcis à une touche** (utile avec la dictée vocale ou une aide technique).

## Tenants Microsoft 365

Active **Réglages → Administration Microsoft 365** (ou « J'administre un tenant Microsoft 365 » dans l'assistant) : un espace **Admin O365** est ajouté avec un bloc par domaine. Tes autres espaces ne changent pas.

Pour un autre tenant ou d'autres catégories : **+ Nouveau bloc** → Modèle **Admin Microsoft 365** → nom du tenant (`contoso`, ou une adresse comme `contoso.sharepoint.com`), puis coche les catégories : administration principale, collaboration, Power Platform, sécurité et conformité, appareils, Copilot et IA, mon compte, outils et diagnostic. Un bloc est créé par catégorie, et le tenant est ajouté s'il n'existe pas.

Seuls SharePoint, OneDrive et Azure suivent le tenant choisi. Les centres d'admin (Microsoft 365, Entra, Teams, Exchange…) ouvrent le tenant du compte connecté.

Chaque tenant a une couleur, qui entoure le sélecteur, et son nom s'ajoute au titre de l'onglet (`[CONTOSO]`) pour éviter de travailler sur le mauvais tenant.

## Liens modèles

```
https://{tenant}.sharepoint.com       → https://contoso.sharepoint.com
https://console.example.com/{tenant}  → https://console.example.com/contoso
https://mail.{domain}                 → https://mail.contoso.com (si le domaine est contoso.com)
```

Les tenants se gèrent dans **Réglages → Tenants**. Ce groupe n'apparaît que si un tenant existe ou si un lien utilise `{tenant}`. Le sélecteur ne s'affiche que dans les espaces qui contiennent un lien modèle.

## Tests

Tests de non-régression dans Chrome headless, sans rien installer dans la page elle-même :

```bash
cd tests
npm install
npm test            # tout
npm test compare    # seulement la comparaison avec la version de référence
npm test features   # seulement les fonctions et l'accessibilité
```

- **Comparaison** : chaque scénario (4 dispositions en clair et sombre, mobile, réglages, édition, tiroirs, recherche, palette, assistant, imports…) est joué sur la copie de travail et sur le tag git `pre-modularisation` (ou `BASE_REF=…`). Captures d'écran, DOM et données enregistrées doivent être identiques.
- **Fonctions** : données existantes intactes, favicons privés, palette, partage, abonnements, ménage, heures de travail, et axe-core (WCAG 2.2 AA) sur l'appli et l'aide.
- Prérequis : Google Chrome (`CHROME=…` pour un autre chemin) et `python3`. En cas d'échec, captures et différences dans `tests/out/`.

## Licence

[MIT](LICENSE) © 2026 ostefnn.

Services tiers utilisés, chacun sous ses propres conditions : [Open-Meteo](https://open-meteo.com) (données météo CC BY 4.0), [Picsum](https://picsum.photos) (photos [Unsplash](https://unsplash.com/license)), Google Fonts (Lexend, Source Sans 3 — SIL Open Font License), favicons Google.
