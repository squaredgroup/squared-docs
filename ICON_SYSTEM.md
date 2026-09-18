# Squared Help Center — Icon System

Le Help Center utilise **Iconly v2 Essential** comme famille d’icônes fonctionnelles.

Source technique : `react-iconly`, implémentation open-source MIT du pack Iconly v2 Essential.

## Styles Squared

- **Outline** — style principal de navigation et d’action. Basé sur Iconly Light avec un trait légèrement renforcé.
- **Regular** — Iconly Light avec le stroke régulier d’origine.
- **Fill** — Iconly Bold. Utilisé uniquement pour un état actif, sélectionné ou important.

## Règle d’utilisation

| Contexte | Style |
|---|---|
| Navigation inactive | Outline |
| Navigation active | Fill |
| Sous-navigation | Regular |
| Boutons / actions | Outline ou Regular |
| Favori inactif | Outline |
| Favori actif | Fill |
| Notification normale | Outline |
| Notification avec nouvel élément | Fill |
| Sécurité / statut validé | Fill uniquement si état confirmé |

## Architecture

Les SVG sont embarqués dans le projet et rendus en **24×24**. Aucun service externe n’est nécessaire à l’exécution.

Le renderer central est exposé via :

```js
window.SQIconly
```

Les définitions sources sont conservées dans :

```text
assets/iconly-v2.js
```

et intégrées au runtime commun de la sidebar.

## Règles Squared

1. Aucun emoji comme icône d’interface.
2. Aucun sigle comme `SUP`, `COM`, `STS`, `WX`, etc. à la place d’une icône.
3. Une taille standard de **17 px** dans la navigation principale.
4. Sous-navigation : environ **13 px**.
5. Pas de mélange avec Font Awesome, Material Icons ou une autre famille.
6. Le logo Squared est un asset de marque et n’est jamais remplacé par une icône.
7. Les emojis restent autorisés uniquement comme réactions de contenu dans le forum.

## Licence

L’implémentation `react-iconly` utilisée comme source des tracés Iconly v2 est distribuée sous licence MIT.
