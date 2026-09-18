# Contribuer à Squared Help Center

Squared Help Center doit rester précis, lisible, versionné et sûr.

## Types de contribution

- corriger une information obsolète ou imprécise ;
- améliorer une explication ;
- proposer un nouveau guide ;
- signaler un lien cassé ;
- améliorer l'accessibilité ou le responsive ;
- proposer une amélioration de navigation ou de recherche.

## Avant de modifier

1. Vérifier que le sujet n'est pas déjà couvert.
2. Limiter le changement au périmètre utile.
3. Ne jamais inclure d'information sensible.
4. Conserver la cohérence visuelle et éditoriale.
5. Tester les liens et le responsive concernés.

## Conventions

### Commits

Exemples :

- `docs: corrige la procédure de publication`
- `feat: ajoute un module de documentation`
- `fix: corrige la navigation mobile`

### Rédaction

- français clair et direct ;
- titres courts ;
- procédures ordonnées ;
- distinguer règle, recommandation et avertissement ;
- éviter le jargon lorsqu'une formulation simple suffit ;
- ne pas écrire une règle pour une personne précise : documenter un rôle ou un niveau d'intervention.

## Sécurité

Ne jamais publier :

- mot de passe ou token ;
- clé API ou secret ;
- donnée personnelle ou client non publique ;
- endpoint privé ou information d'infrastructure sensible ;
- procédure de contournement d'un contrôle d'accès.

## Questions et demandes

Utiliser les templates GitHub Issues disponibles depuis la page Questions & contributions du site.


## Navigation

Ne jamais recopier manuellement la sidebar dans une page. La navigation globale est générée par `assets/sidebar.js` et stylée par `assets/sidebar.css`.

Pour une nouvelle page :

1. ajouter le placeholder `<aside class="sidebar hc-sidebar" id="sidebar"></aside>` ;
2. charger `assets/sidebar.css` ;
3. charger `assets/sidebar.js` avant `assets/docs.js` ;
4. ajouter la nouvelle route une seule fois dans la configuration de `assets/sidebar.js`.

Les ancres ou chapitres propres à une page doivent utiliser un sommaire local, pas la sidebar globale.
