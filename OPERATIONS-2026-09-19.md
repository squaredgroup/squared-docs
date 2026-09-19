# Livraison opérationnelle — 19 septembre 2026

## Base conservée

Le dépôt disposait déjà de la recherche PostgreSQL, du centre de statut persistant, des incidents et maintenances, des pièces jointes privées, des macros et d'un compte administrateur. Cette livraison ne les recrée pas et ne modifie pas les rôles existants.

## Changements

- Console Admin : chargement isolé des six onglets, reprise sur erreur, boutons réellement raccordés, formulaires sans doubles soumissions.
- Incidents et maintenances : utilisation des RPC transactionnelles existantes plutôt que de plusieurs écritures partielles.
- Analytics : métriques agrégées par le backend, absence de faux score de 100 % lorsqu'aucun avis n'a été reçu, contexte de période indiqué.
- Recherche : annulation des anciennes requêtes, protection contre une réponse arrivée en retard, classement documentation / forum / tickets personnels / incidents / services / maintenance, navigation clavier.
- Articles administrables : `editorial.html` pour l'équipe ; `article.html?id=...` pour la lecture ; brouillon, revue, publication, obsolescence, archive et historique des révisions.
- Les nouveaux articles administrables sont stockés en texte Markdown simple. Le HTML brut n'est pas exécuté. Les guides HTML existants restent versionnés dans GitHub et ne sont pas remplacés par des copies en base.
- Écritures éditoriales : contrôle de concurrence par numéro de révision et verrouillage transactionnel ; l'auteur d'une ancienne version doit recharger avant sauvegarde.
- Compte : erreurs de changement d'e-mail explicites, export des données personnelles via la RPC existante, action volontaire de déconnexion globale, canaux de notification non raccordés indiqués comme tels.
- Vie privée : les recherches authentifiées ne conservent pas leur texte dans les événements ; l'historique textuel local de la page Recherche est supprimé.

## Accès

`admin.html#knowledge` mène aux articles. Le bouton **Créer un article** ouvre `editorial.html`. Un article administrable publié dispose d'une URL `article.html?id=UUID` et apparaît dans la recherche PostgreSQL.

La publication est une action explicite de l'éditeur. Le support privé demeure réservé au demandeur et aux personnes habilitées. L'accès visuel aux écrans n'est pas un remplacement de la RLS.

## Validation

Le workflow `.github/workflows/help-center-quality.yml` exécute :

1. `node --check` sur les fichiers JavaScript ;
2. des tests Chromium avec backend isolé : onglets Admin, refus d'un rôle membre, rendu de l'éditeur, HTML inerte, mobile, résultats asynchrones, clavier, changement d'e-mail et notifications ;
3. des requêtes publiques **en lecture seule** vers l'API : articles publiés, invisibilité des brouillons, absence de données privées et refus des métriques internes.

Les rapports et captures sont conservés sept jours en artefacts GitHub Actions. Les fixtures navigateur ne sont pas de vrais utilisateurs et n'écrivent jamais dans Supabase.

Ces tests ne constituent pas un audit de sécurité complet, ni une validation exhaustive de tous les appareils. Les contrôles entre plusieurs comptes réels et les tests d'e-mails de bout en bout restent distincts.

## Limites explicites

- Le canal d'e-mail pour les notifications d'activité n'est pas raccordé. Les confirmations et réinitialisations d'authentification sont un autre service.
- La traduction anglaise complète n'est pas livrée ; l'interface ne prétend pas la proposer.
- Une application native sans télémétrie n'est pas déclarée disponible à partir du seul état de son site web.
- Une mesure ancienne ou inconnue ne devient pas verte dans le résumé Admin.
- Les avertissements Supabase concernant l'emplacement de pg_net et la protection des mots de passe compromis doivent être suivis séparément, sans changer à l'aveugle l'infrastructure existante ni activer une offre payante.

## Reproduction locale

```sh
python -m pip install playwright==1.55.0
python -m playwright install chromium
python tests/account_acceptance.py
python tests/public_boundaries.py
```

La seconde commande de test nécessite un accès réseau et utilise uniquement la clé publique déjà destinée au frontend. Aucun secret serveur n'est ajouté au dépôt.
