# État réel de la livraison — 19 septembre 2026

## Backend appliqué

Les migrations suivantes ont été appliquées au projet Squared Help Center, en conservant les données existantes :

- help_center_integrity_and_private_support
- help_center_editorial_and_atomic_operations
- protect_internal_support_files
- help_center_metrics_and_admin_continuity
- help_center_observations_and_personal_export
- finalize_operation_table_privileges
- preserve_trusted_counter_updates

Elles couvrent la protection des champs réservés, les notes internes et pièces jointes, la récompense de solution idempotente, la recherche enrichie, le versionnement documentaire, les publications d’incident atomiques, les statistiques sans pourcentage inventé, le journal d’opérations et l’export personnel.

La migration de centralisation du secret de monitoring n’a pas été appliquée : son appel a été bloqué. Le monitoring existant et ses identifiants n’ont pas été remplacés.

## Contrôles réellement exécutés

- Lecture du dépôt et du schéma Supabase actuels, sans se baser sur l’ancien inventaire.
- Confirmation d’un administrateur existant : aucun nouveau compte administrateur n’a été créé.
- Appel de recherche réussi sur les documents Workspace.
- Lecture de 33 composants ayant des observations exploitables et confirmation de contrôles persistants récents.
- Vérification de l’absence de droit anonyme sur la configuration privée et sur la fonction d’export personnel.
- 8 tests unitaires locaux exécutés avec succès : routes sûres, ancienneté de mesure, produits en développement, absence de données statistiques, échappement Markdown/HTML, recherche accentuée dans le corps, dédoublonnage des résultats.
- Le fichier hc-state.js testé a exactement le blob Git `2b0c381981e5a24f5662f32c861168106acc64aa`.

## Non exécuté — ne pas présenter comme validé

- Le test transactionnel de rôles authentifiés sur la production a été bloqué et n’a pas été exécuté. Aucun compte de test n’a été inséré.
- La création du workflow GitHub Actions de compilation/validation a été bloquée. Aucun workflow n’a été installé par cet appel.
- Les tests navigateur sont rédigés mais n’ont pas été exécutés.
- Le build complet (HTML assemblé, bundle Supabase local, bundle React, index HTML et compilation Tailwind) n’a pas été exécuté.
- Les nouveaux écrans ne sont pas publiés sur main.

## Conséquence de publication

Cette branche doit rester en revue/brouillon. `scripts/release_build.py`, `scripts/bundle.mjs`, `scripts/check.mjs` et les tests décrivent une chaîne de préparation, mais les fichiers générés ne sont pas présents. En particulier, le nouveau client attend `assets/vendor/supabase.js` et la recherche locale attend `assets/knowledge-index.json`.

Ne pas fusionner cette branche en production tant que la compilation, les tests navigateur et la revue d’intégration n’ont pas abouti. Le site public existant est conservé.

## Hors périmètre effectivement activé

Aucun fournisseur d’e-mails support/incidents, traduction anglaise, assistant IA documentaire ou nouveau canal de distribution natif Workspace n’a été activé. Aucune activité communautaire ni mesure de disponibilité n’a été inventée.
