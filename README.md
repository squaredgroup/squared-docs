# Squared Help Center

Documentation centrale de Squared Group.

## Structure

- `index.html` — portail principal
- `wix-studio.html` — guide complet Wix Studio
- `workspace.html` — documentation produit Squared Workspace
- `design-system.html` — fondations UI/UX
- `process.html` — process et opérations
- `development.html` — conventions engineering
- `security.html` — sécurité et gouvernance
- `changelog.html` — historique versionné
- `community.html` — questions et contributions
- `assets/docs.css` — design system du portail
- `assets/docs.js` — thème, recherche et interactions
- `assets/sidebar.css` — style de la navigation globale
- `assets/sidebar.js` — source unique de la sidebar et calcul automatique de l’item actif

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
