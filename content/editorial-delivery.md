# Livraison éditoriale membres

Version source : `member-editorial-20260926`.

26 nouveaux articles et 44 articles réécrits. 16 réponses de FAQ. Quatre parcours statiques. Trois sources administrables conservées sans duplication.

## Périmètre

Clients, collaborateurs, Workspace web, Help Center, Build, Wix Studio, Design System, développement et sécurité. Les 29 chapitres du manuel Wix et les guides d’accès déjà approfondis sont conservés. Les pages de service et les données privées ne sont pas réinitialisées.

## Vérification

La relecture de code et de méthode est distincte des tests de rendu et de parcours. Les rapports de tests et les contrôles de publication doivent être consultés avant de considérer le déploiement comme confirmé. Aucun paiement réel, aucune invitation, aucun ticket ni aucune modification de rôle n’est exécuté pour produire cette documentation.

## Sources et entretien

`editorial-register.csv` et `.json` recensent les décisions par page. `editorial-provenance.json` conserve les sources et limites. `editorial-charter.md`, `editorial-templates.md` et `editorial-decisions.md` organisent la suite. Les tests de contenu ne créent pas de promesse commerciale.

## Compilation

`python -m pip install -r scripts/editorial/requirements.txt`
`python scripts/editorial/build.py`
`python tests/editorial_contract.py`

Les pages générées restent des HTML lisibles sans JavaScript. Les sources éditoriales sont dans `content/editorial/`. Les chemins historiques sont conservés. Le site continue d’utiliser son backend et son mode de publication existants.
