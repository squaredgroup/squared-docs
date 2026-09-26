# Charte éditoriale — Squared Help Center

Version de travail appliquée au corpus du 26 septembre 2026. Cette charte organise la documentation ; elle n’ajoute aucune condition commerciale aux collaborations Squared.

## Mission

Le Squared Help Center accompagne les clients, collaborateurs et utilisateurs dans leur utilisation des services Squared. Il leur permet de comprendre leur environnement, de réaliser une action et de résoudre une difficulté sans connaître l’organisation interne du groupe.

Chaque contenu répond à un besoin identifiable. Il distingue ce que la personne peut faire, ce qui nécessite une autorisation et ce qui doit être confié à une personne habilitée. Il décrit le fonctionnement disponible, ses limites et les différences pertinentes entre plateformes. Une fonction envisagée n’est jamais présentée comme opérationnelle.

## Publics et frontières

- **Clients :** comprendre la collaboration, transmettre des éléments, suivre le projet, faire un retour et retrouver les livrables.
- **Collaborateurs :** comprendre une mission, préparer le travail, signaler les difficultés, remettre et transmettre un résultat.
- **Utilisateurs de produits :** accéder au bon espace, réaliser les actions proposées et comprendre les erreurs.
- **Intervenants habilités :** appliquer les méthodes de conception, développement, publication et protection adaptées à leur responsabilité.

Le site Squared Group présente les offres. Workspace sert au travail. Build accueille les formations. Le Help Center explique les usages et le dépannage ; il ne doit pas recopier les cours ni héberger des dossiers clients.

Un article destiné à un membre n’est pas automatiquement privé. Les pages statiques de ce dépôt restent publiques. Les procédures sensibles, montants individuels, contrats et décisions confidentielles ne sont pas placés ici. Une simple mention « interne » ou une URL difficile à deviner ne protège rien.

## Voix et vocabulaire

Le Help Center utilise le vouvoiement, une voix professionnelle et humaine et des phrases complètes. Il évite le ton publicitaire, les superlatifs invérifiables et la culpabilisation. Les textes d’erreur expliquent le problème et la prochaine action possible.

Les noms de boutons et de champs sont ceux de l’interface vérifiée. Ils peuvent rester dans la langue du produit lorsqu’un autre libellé n’est pas proposé. Les termes courants sont privilégiés : « contrôle qualité » avant « QA », « responsable » avant « owner ». Un terme technique utile est expliqué à sa première apparition. Le glossaire public constitue le point de référence transversal.

Les titres annoncent une action, une difficulté ou une explication précise. Ils évitent les promesses absolues comme « tout savoir » lorsque le périmètre est limité. La réponse essentielle apparaît au début. Le texte d’un lien décrit la destination.

## Formats

**Premiers pas :** un parcours pour une première utilisation, avec prérequis, étapes et prochaine action. **Procédure :** une action précise et un résultat à contrôler. **Dépannage :** un symptôme, des vérifications non destructives et des branches selon le résultat. **Référence ou explication :** des termes, règles et limites clairement distingués des manipulations de l’interface.

Une FAQ donne une réponse courte et renvoie à la procédure de référence. Un sujet du forum n’est pas compté comme un guide complet. Une page de compte, une liste de tickets ou un tableau de statut est une interface de service, pas nécessairement un article.

## Contrat d’un article

Un article doit préciser son public, son produit et son objectif. Une procédure mentionne les prérequis et permissions utiles, les étapes dans l’ordre, les libellés vérifiés, le résultat attendu et les cas de blocage. Les variantes mobiles sont ajoutées quand elles diffèrent réellement, pas pour allonger le texte.

Les captures sont issues de la bonne interface, avec des données fictives ou expurgées. Une capture du portail web n’est pas présentée comme celle d’une application native. Les étapes restent compréhensibles sans l’image. La documentation n’utilise pas de faux écrans pour prouver une fonction.

Il n’existe pas de minimum artificiel de mots. La profondeur est déterminée par le besoin. Un texte long sans réponse exploitable n’est pas meilleur qu’une procédure courte et suffisante.

## Exactitude et niveaux de preuve

Le registre distingue **relecture de méthode**, **vérification dans le code**, **test de rendu ou de parcours simulé**, et **vérification réelle en ligne**. Un test isolé ne devient pas une validation de production. Un statut HTTP ne prouve pas le fonctionnement de toutes les fonctions ou de tous les appareils.

Les versions natives, les paiements, les mails réellement reçus et les permissions entre comptes réels nécessitent des essais spécifiques autorisés. En leur absence, le texte reste conditionnel et les limites sont inscrites dans le rapport. Les tarifs, délais, modalités de modification et conditions d’accompagnement ne sont écrits qu’à partir d’une décision ou d’un document confirmé.

Le registre conserve la date de revue du contenu, le type de preuve et une responsabilité de suivi. Une date de revue ne signifie pas que toutes les actions décrites ont été exécutées avec de vraies données.

## Sources et absence de doublons

Les guides HTML restent versionnés. Le corpus JSON/Markdown alimente leurs pages générées, leur index local et les parcours. Les articles administrables gardent leur source dans l’éditeur existant. L’index ne devient pas une source éditoriale indépendante.

Une question doit disposer d’un article de référence identifiable. Les résumés et guides courts renvoient vers lui. Les anciens liens sont conservés quand un article est réécrit. Une fusion ou un archivage demande une destination de remplacement et une vérification des liens.

Le flux public de contenu Workspace est une troisième surface de publication déjà intégrée au Help Center. Les entrées qui renvoient vers un guide HTML restent des références, pas de nouvelles copies de cet article. Les FAQ et les contenus structurés publiés depuis Workspace conservent leur source et leurs contrôles d’accès. Cette livraison ne les réécrit pas en base.

## Processus de publication

1. Identifier le besoin, le public, la source et les éventuelles décisions manquantes.
2. Rédiger ou compléter la source de référence, sans dupliquer une page existante.
3. Relire le fond, la confidentialité, les noms de commandes et les liens.
4. Générer les pages et exécuter les contrôles de contenu, de navigation et de rendu.
5. Intégrer une version cohérente, puis vérifier le contenu réellement publié.
6. Enregistrer les résultats et les limites de validation.

La personne responsable du produit valide les comportements sensibles. Le responsable de la relation client confirme les conditions commerciales. Les rôles ci-dessus sont des responsabilités à attribuer, pas l’affirmation qu’une équipe dédiée existe déjà.

## Entretien

Chaque changement de produit susceptible d’invalider un guide doit déclencher une revue du guide concerné. Une revue mensuelle du registre et des questions récurrentes est une cadence proposée, non une automatisation de notification active. Les signalements utiles, liens cassés et recherches infructueuses alimentent les priorités lorsqu’ils sont disponibles.

On mesure des parcours couverts et des blocages résolus, pas seulement un volume de pages. Le bilan distingue les contenus rédigés, les vérifications effectuées, la publication et les points restant à confirmer.

## Références publiques

- W3C WAI, écriture accessible : https://www.w3.org/WAI/tips/writing/
- Wix, rôle des datasets : https://support.wix.com/en/article/cms-about-datasets
- Sources produit et périmètre des vérifications : `editorial-provenance.json`.
