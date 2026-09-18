# Squared Help Center

Documentation centrale de Squared Group.

## Structure

### Centre d’aide
- `index.html` — accueil
- `getting-started.html` — bien démarrer
- `faq.html` — FAQ
- `quick-guides.html` — guides rapides
- `support.html` — support
- `community.html` — communauté
- `status.html` — statut
- `changelog.html` — nouveautés

### Base de connaissances
- `wix-studio.html` + `wix/`
- `workspace.html` + `workspace/`
- `design-system.html` + `design-system/`
- `process.html`
- `development.html` + `development/`
- `security.html` + `security/`

### Assets communs
- `assets/docs.css`
- `assets/docs.js`
- `assets/sidebar.css`
- `assets/sidebar.js`
- `assets/logo-squared.png`

La sidebar globale est générée depuis `assets/sidebar.js`. Les pages ne contiennent qu’un placeholder `<aside id="sidebar">`.

## Développement local

Aucune compilation n'est nécessaire. Ouvrir `index.html` dans un navigateur ou lancer un serveur statique local.

## Publication

GitHub Pages publie la branche `main`. Les changements deviennent visibles après le déploiement Pages.

## Règle de sécurité

Le dépôt et le site étant publics, ne jamais y placer de mot de passe, token, clé API, donnée client confidentielle ou information d'infrastructure sensible.

Voir [CONTRIBUTING.md](CONTRIBUTING.md) avant toute contribution.


## Navigation globale

La sidebar n'est jamais copiée dans les pages.

Chaque page contient uniquement :

```html
<aside class="sidebar hc-sidebar" id="sidebar"></aside>
```

Puis charge `assets/sidebar.js`. Toute modification de la navigation globale doit être faite dans ce fichier unique.

Les pages d'article utilisent leur propre sommaire local pour les sections internes ; la sidebar reste réservée à la navigation globale du Help Center.


## Backend natif

Le forum et le support utilisent un projet Supabase dédié : **Squared Help Center**.

Fonctions couvertes :
- authentification ;
- profils ;
- catégories ;
- discussions ;
- réponses ;
- votes ;
- réactions ;
- favoris ;
- notifications ;
- signalements ;
- support privé ;
- rôles de modération ;
- stockage d’avatars.

Les règles d’accès sont protégées par RLS. GitHub n’est pas utilisé comme interface utilisateur du forum ou du support.


## Forum et support natifs

Depuis la v6.0, la communauté et le support ne redirigent plus vers GitHub.

Le frontend est hébergé par GitHub Pages, mais les données fonctionnelles sont stockées dans le projet Supabase dédié **Squared Help Center**.

Pages principales :
- `forum.html`
- `forum-topic.html`
- `forum-new.html`
- `profile.html`
- `bookmarks.html`
- `notifications.html`
- `support.html`
- `support-ticket.html`
- `moderation.html`

GitHub reste uniquement la source de code et l’historique technique.


## Expérience v6.0

La v6.0 ajoute une couche produit commune au Help Center :

- logo officiel dans le hero d’accueil ;
- sidebar compacte et mode mini ;
- topbar et actions rapides ;
- raccourcis clavier `g h`, `g f`, `g s`, `g p` ;
- mode focus sur les articles ;
- contenus liés et feedback d’article ;
- accueil avec activité communauté ;
- forum et support modernisés ;
- filtres notifications / changelog ;
- recherche dans les favoris ;
- FAQ en accordéon.


## Icônes

Toutes les icônes fonctionnelles du Help Center utilisent Iconly. Voir [ICON_SYSTEM.md](ICON_SYSTEM.md).

Ne pas ajouter d’emoji, de sigle ou d’autre pack d’icônes dans l’interface.


## États des serveurs

La page `server-status.html` fournit une vue technique distincte du statut général.

Elle vérifie depuis le navigateur :
- le frontend GitHub Pages ;
- le domaine personnalisé et HTTPS ;
- Supabase Auth ;
- Supabase REST / Database ;
- les données publiques du forum ;
- Supabase Realtime ;
- la disponibilité du backend support.

Le script dédié est `assets/server-status.js`. Les tests n’exposent aucun secret privé et utilisent uniquement la clé publishable déjà prévue pour le frontend.


### Extension écosystème

Le monitoring couvre maintenant **Squared Group et Squared Workspace** en plus du Help Center.

Routes Wix vérifiées depuis la configuration publiée du site :
- `https://www.squaredgroup.studio/`
- `/services`
- `/projects`
- `/products`
- `/contact`
- `/resources`
- `/agency`
- `/squared-build`
- `/workspace`

L’app principale Squared Workspace est testée via `https://workspace.squaredgroup.studio/`.

Pour les sites externes, le navigateur teste leur accessibilité réseau avec une requête `no-cors`. Un statut vert signifie donc que la ressource est joignable depuis le navigateur ; il ne constitue pas encore une preuve de santé de chaque fonction backend interne.


#### Modules complémentaires monitorés

La page États des serveurs peut également déplier les modules publics suivants du site officiel :

- Pricing
- About
- FAQ
- Start a Project
- Solutions
- Process
- Team
- Clients
- Partners
- Roadmap
- Jobs
- Press
- Newsletter
- Booking
- Security
- Accessibility
- Testimonials

Ces routes proviennent de la configuration Wix publiée du site Squared Group.


## Stack moderne

Depuis la v6.1, le Help Center reste **static-first** pour la vitesse et le SEO, mais utilise aussi une couche moderne :

### React 19
`assets/react-ui.js` contient des React islands chargées en ESM. React améliore les zones interactives sans prendre le contrôle de toute la page HTML.

Cette architecture évite :
- un écran blanc au chargement ;
- une migration massive des pages existantes ;
- une dépendance à React pour lire la documentation.

### Tailwind CSS v4
Tailwind est compilé en CSS statique :

```text
src/tailwind.css
→ @tailwindcss/cli
→ assets/tailwind.generated.css
```

Le build est automatisé par :

```text
.github/workflows/tailwind-build.yml
```

Tailwind est importé **sans Preflight** pour ne pas réinitialiser les styles historiques du Help Center.

### JavaScript progressif
Les scripts historiques restent modulaires :
- `assets/sidebar.js`
- `assets/docs.js`
- `assets/forum.js`
- `assets/server-status.js`

React complète ces scripts au lieu de les remplacer brutalement.
