# Cockpit SteffPoint

Page d'accueil personnelle pour Safari (et tout navigateur) : horloge, météo, recherche et favoris rangés par blocs, avec des tenants et des environnements DEV / TEST / PROD.

Un seul fichier `index.html`, sans dépendance ni serveur. Inspiré de [Bonjourr](https://bonjourr.fr).

**En ligne : https://ostefnn.github.io/cockpit-steffpoint/**

## Fonctionnalités

- **Accueil** : horloge, date, salutation, météo ([Open-Meteo](https://open-meteo.com), sans clé).
- **Fond** : photo floutée qui change chaque onglet, heure ou jour ([Picsum](https://picsum.photos)), dégradé, couleur unie, image par URL ou photo locale. Flou, luminosité et voile réglables.
- **Recherche unifiée** : filtre les favoris en direct, Entrée ouvre le premier résultat, sinon recherche web (Bing, Google, DuckDuckGo, Ecosia).
- **Blocs de favoris** : couleur, liste ou grille d'icônes, repli, « Afficher plus » au-delà de N liens, glisser-déposer, ajout par collage d'URL, annulation des suppressions.
- **Espaces** (Pro / Perso…) avec bascule automatique le week-end.
- **Tenants** : dans une adresse, `{tenant}` et `{domain}` sont remplacés par le tenant choisi.
- **Environnements** : chaque favori peut avoir une adresse DEV et TEST en plus de l'adresse principale (PROD). Hors PROD, la capsule s'entoure d'un liseré et le titre de l'onglet est préfixé `[DEV]` ou `[TEST]`.
- **Réglages** façon Bonjourr, thème clair / sombre / système.
- **Sauvegarde** : export / import JSON, import des signets Safari, rappel d'export.

## Installation dans Safari

**Version en ligne (recommandée)**

1. Safari → Réglages → Général → **Page d'accueil** : `https://ostefnn.github.io/cockpit-steffpoint/`.
2. Choisir « Page d'accueil » pour les nouvelles fenêtres et les nouveaux onglets.

**Version locale** (fonctionne hors ligne, sauf météo, photos et polices)

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

Services externes appelés : Open-Meteo (météo), Picsum (photos), Google (favicons, désactivable : Réglages → Favoris → Icônes → Initiales), Google Fonts.

## Raccourcis

| Touche | Action |
| --- | --- |
| `/` | Rechercher |
| `↑` `↓`, `Entrée` | Choisir et ouvrir un résultat (`⌘ Entrée` : nouvel onglet, `Maj Entrée` : recherche web) |
| `E` | Mode édition |
| `,` | Réglages |
| `1`–`9` | Changer d'espace |
| `T` | Tenant suivant |
| `V` | Environnement suivant |
| `Échap` | Fermer / vider |

## Liens modèles

```
https://{tenant}.example.com          → https://client-a.example.com
https://console.example.com/{tenant}  → https://console.example.com/client-a
https://mail.{domain}                 → https://mail.client-a.com (si le domaine est client-a.com)
```

Les tenants se gèrent dans **Réglages → Tenants**. Les exemples « Client A » et « Client B » peuvent être supprimés.

## Licence

[MIT](LICENSE) © 2026 ostefnn.

Services tiers utilisés, chacun sous ses propres conditions : [Open-Meteo](https://open-meteo.com) (données météo CC BY 4.0), [Picsum](https://picsum.photos) (photos [Unsplash](https://unsplash.com/license)), Google Fonts (Lexend, Source Sans 3 — SIL Open Font License), favicons Google.
