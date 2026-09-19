# Parcours d’assistance — livraison du 19 septembre 2026

Cette livraison poursuit l’amélioration du Help Center sans modifier les comptes, les données privées ou la configuration du backend de production.

## Parcours livrés

- Accueil orienté besoin : client, applications, collaboration.
- `parcours.html` : trois entrées et des étapes vers des guides existants.
- `diagnostic.html` : produit, problème, appareil, puis vérifications concrètes. Seules les vérifications cochées sont reprises. Rien n’est envoyé automatiquement.
- `access-help.html` : récupération distincte pour Workspace et Help Center, avec point de contact officiel accessible sans session.
- Support : état de chargement, visiteur, membre et erreur distincts. Les compteurs et demandes ne sont visibles qu’après confirmation de session.
- Apparence : Clair, Sombre et Système. Le système réagit au choix de l’appareil sans imposer un mode sombre par défaut.

## Recherche

L’index local est généré uniquement à partir des guides publics versionnés. Il comprend les chapitres du guide Wix. La recherche globale et la page de résultats partagent le même classement, les mêmes libellés de provenance et le même rendu texte sûr. Les tickets ne sont pas ajoutés à l’index statique.

Une panne ou un délai du backend déclenche un avertissement de recherche partielle. Les résultats tardifs ne remplacent pas une recherche plus récente. La déconnexion efface les résultats privés en cours. Les suggestions du formulaire support utilisent uniquement l’index public local ; le corps privé du ticket n’est pas envoyé comme recherche.

## Documentation Workspace

Six guides pratiques couvrent activation, connexion, documents, installation, permissions et dépannage. Le code du portail web a été relu au commit `c355aa6eaa3a3b4ad0d5da5bc47b50e1354fe852` de `squaredgroup/squared-workspace-web`.

Le domaine publié du portail est `workspace.app.squaredgroup.studio`. L’interface du Help Center ne représente pas celle de Workspace.

Les deux captures des formulaires d’accès sont générées depuis le vrai code du portail, exécuté localement sans donnée saisie et avec les requêtes backend bloquées. Ce sont des captures du portail web, pas des maquettes natives. Elles n’attestent pas la santé actuelle du serveur.

L’installation native est décrite conditionnellement selon l’invitation disponible. Aucune publication App Store ou distribution TestFlight actuellement ouverte n’est supposée. Les instructions générales TestFlight et Safari renvoient aux guides Apple.

## Continuité sans effets de bord

Un guide public peut être conservé volontairement sur l’appareil pendant 30 jours. Aucun titre de ticket ni requête privée n’est conservé dans ce mécanisme. Le retrait et la déconnexion effacent cette préférence de lecture.

Le bloc personnel d’accueil affiche uniquement les véritables demandes du compte connecté qui attendent sa réponse. Un résultat reçu après déconnexion n’est pas affiché.

L’équipe peut préparer un brouillon depuis une discussion publique ou sa réponse acceptée. Cette préparation n’enregistre ni ne publie l’article. La révision et la confirmation de publication restent obligatoires dans l’éditeur existant.

## Construction et validation

- `scripts/integrate_assistance.py` applique les liens et modifications de façon idempotente.
- `scripts/help_guide_content.py` produit les pages versionnées.
- `scripts/capture_workspace_guides.py` capture les deux formulaires réels.
- `tests/assistance_journeys.py` contrôle parcours, recherche, apparence, confidentialité et absence de mutation implicite sur un backend isolé.
- Les suites mobile, visuelle et administration/compte existantes doivent aussi passer.

Le correctif responsive reste chargé après les autres couches de style. Cette livraison ne procède pas à une réécriture complète des CSS historiques et ne prétend pas constituer un audit exhaustif WCAG ou Core Web Vitals.

## Limites explicites

Le diagnostic consulte les incidents déclarés, pas l’état de chaque appareil utilisateur. Une absence d’incident déclaré n’est pas une preuve de bon fonctionnement.

Aucun contournement d’identité n’est proposé. La récupération hors compte renvoie à l’équipe, pas à des tickets privés.

Le backend Oracle de Workspace, sa configuration CORS et la distribution des apps natives ne sont pas modifiés par cette livraison du centre d’aide.
