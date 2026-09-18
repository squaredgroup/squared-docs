# Squared Help Center — Icon System

Le Help Center utilise **Iconly** comme système d’icônes fonctionnelles.

## Styles

- **Outline** — style par défaut : navigation, actions, cartes, champs et outils.
- **Fill / Solid Glyph** — état actif, notification importante, favori actif, navigation active.
- **Regular / Line Art** — éléments secondaires, sous-navigation, aides et micro-actions.

Dans le code :

- `outline` → `ci-outline`
- `fill` → `ci-glyph`
- `regular` → `ci-line`

## Source

Le frontend charge la bibliothèque publique Iconly via :

```html
https://cdn.iconly.ai/iconly/public/iconly.js
```

Le mapping central est défini dans `assets/sidebar.js` via `window.SQIconly`.

## Règles

1. Ne jamais utiliser d’emoji comme icône d’interface.
2. Ne jamais utiliser de sigle comme `SUP`, `COM`, `STS`, `WX` dans une boîte d’icône visible.
3. Ne pas mélanger plusieurs familles d’icônes.
4. Le logo Squared reste un asset de marque et n’est jamais remplacé par Iconly.
5. L’état actif utilise en priorité **Fill**.
6. Les sous-pages utilisent en priorité **Regular / Line Art**.
7. Les contrôles standards utilisent **Outline**.

Les emojis sont autorisés uniquement comme **réactions communautaires** au contenu du forum.
