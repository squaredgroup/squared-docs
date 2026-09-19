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

Depuis la v4.0, la communauté et le support ne redirigent plus vers GitHub.

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

Le Status Center utilise désormais un **monitoring persistant côté serveur**.

Architecture :

```text
Supabase Edge Function status-monitor-v2
→ toutes les 5 minutes via pg_cron + pg_net
→ service_components
→ health_checks
→ uptime 30 jours
→ status.html / server-status.html
```

Le monitoring couvre :
- Squared Group et ses principaux modules Wix ;
- Squared Workspace public / web ;
- Squared Help Center ;
- Supabase Auth ;
- Supabase Database / REST ;
- Supabase Realtime ;
- Forum et support.

Les réponses HTTP pouvant provenir d’un anti-bot sont distinguées d’une panne franche : un 401/403/429 ou certains timeouts deviennent **dégradés / non confirmés**, tandis qu’un 404 ou 5xx reste un signal fort de rupture.

Les incidents et maintenances sont désormais des objets persistants et publics via :
- `incidents.html`
- `incident.html?id=...`
- `scheduled-maintenance.html`

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


## Production Ready v7.0

La v7 transforme le Help Center en infrastructure opérationnelle du groupe.

### Recherche universelle
- index `knowledge_documents` ;
- recherche PostgreSQL Full Text ;
- résultats documentation + forum + tickets personnels ;
- page `search.html` ;
- analytics des recherches et clics.

### Squared Help Admin
`admin.html` centralise :
- Knowledge ;
- feedbacks ;
- communauté et signalements ;
- Support Desk ;
- macros ;
- SLA ;
- Status Center ;
- incidents ;
- maintenances ;
- analytics.

L’entrée Admin est masquée aux comptes non staff et les droits restent imposés côté RLS.

### Support Desk
- identifiants `SQ-xxxxx` ;
- produit / catégorie / priorité ;
- SLA première réponse et résolution ;
- pièces jointes privées Storage ;
- notes internes ;
- macros ;
- historique des changements ;
- satisfaction après résolution ;
- suggestions d’articles avant ouverture d’un ticket.

### Account Center
- compte et interface ;
- préférences de notifications ;
- activité ;
- favoris ;
- historique des tickets.

### Community
Le forum est initialisé avec des sujets officiels et permet maintenant de suivre une discussion pour recevoir les nouvelles réponses.

### Workspace Knowledge Base
La documentation Workspace couvre désormais activation, installation, compte, navigation, membres, rôles, clients, collaborateurs, pôles, projets, missions, tâches, planning, messages, documents, contrats, invitations, notifications, raccourcis, recherche et dépannage.


## Parcours d’assistance

La livraison du 19 septembre ajoute les parcours par besoin, le diagnostic guidé, la recherche à sources explicites et six guides Workspace vérifiés. Voir [ASSISTANCE-JOURNEYS.md](ASSISTANCE-JOURNEYS.md) pour la portée, les sources des captures, les tests et les limites.
