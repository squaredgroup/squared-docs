"""Build the task based guide collection from its editable content file."""
from html import escape
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
GUIDES = json.loads((ROOT / 'content/practical-guides.json').read_text())


def e(value):
    return escape(str(value), quote=True)


def head(title, description):
    return f'''<!doctype html><html lang="fr" data-theme="light"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#F7F7F4"><meta name="robots" content="index,follow">
<title>{e(title)} — Squared Help Center</title><meta name="description" content="{e(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/docs.css"><link rel="stylesheet" href="assets/sidebar.css">
<link rel="stylesheet" href="assets/refinement.css?v=20260920.1" data-sq-refinement-style>
<link rel="stylesheet" href="assets/assistance.css?v=20260920.1" data-sq-assistance-style>
<link rel="stylesheet" href="assets/responsive.css?v=20260919.1" data-sq-responsive>
<link rel="stylesheet" href="assets/mobile-experience.css?v=20260924.2" data-sq-mobile-experience-style>
<link rel="stylesheet" href="assets/editorial-intelligence.css?v=20260924.2" data-sq-editorial-intelligence-style>
<link rel="stylesheet" href="assets/experience-v9.css?v=20260924.1" data-sq-experience-v9>
<link rel="stylesheet" href="assets/experience-v10.css?v=20260924.2" data-sq-experience-v10>
</head>'''


def frame(title, body, page_class=''):
    return f'''<body class="{e(page_class)}"><div id="progress" class="progress"></div><div class="app">
<aside class="sidebar hc-sidebar" id="sidebar"></aside><main class="main">
<header class="topbar"><button class="icon-btn mobile-menu" id="menuBtn" aria-label="Ouvrir le menu">☰</button>
<div class="crumbs"><a href="index.html">Centre d’aide</a><span>›</span><a href="guides.html">Guides pratiques</a>{f'<span>›</span><strong>{e(title)}</strong>' if title != 'Guides pratiques' else ''}</div>
<div class="top-actions"><button class="btn hide-mobile" data-search-open>Rechercher <span>⌘K</span></button><a class="btn hide-mobile" href="support.html">Support</a><button class="icon-btn" id="themeBtn" aria-label="Changer de thème">◐</button></div></header>
<div class="shell">{body}<footer class="footer"><span>© 2026 Squared Help · Centre d’aide</span><span class="footer-links"><a href="index.html">Accueil</a><a href="guides.html">Guides pratiques</a><a href="support.html">Support</a></span></footer></div>
</main></div><div class="search-modal" id="searchModal" role="dialog" aria-modal="true" aria-label="Recherche globale"><div class="search-box"><div class="search-head"><input id="searchInput" type="search" placeholder="Rechercher un guide ou une solution…" autocomplete="off"><button class="search-close" id="searchClose">Esc</button></div><div class="search-results" id="searchResults"></div></div></div><div class="toast" id="toast">Copié</div>
<script src="assets/sidebar.js"></script><script src="assets/help-core.js?v=20260919.2" data-sq-help-core></script><script src="assets/docs.js?v=20260924.3"></script>
<script defer src="assets/mobile-nav.js?v=20260924.2" data-sq-mobile-nav></script><script defer src="assets/refinement.js?v=20260920.1" data-sq-refinement-script></script>
<script defer src="assets/assistance.js?v=20260920.1" data-sq-assistance-script></script><script defer src="assets/mobile-experience.js?v=20260924.2" data-sq-mobile-experience-script></script>
<script defer src="assets/editorial-intelligence.js?v=20260924.2" data-sq-editorial-intelligence-script></script></body></html>'''


def article(g):
    steps = ''.join(f'<li class="sq-step"><span class="sq-step-number">{i:02d}</span><div><h3>{e(name)}</h3><p>{e(detail)}</p></div></li>' for i, (name, detail) in enumerate(g['steps'], 1))
    links = ''.join(f'<a href="{e(href)}">{e(label)} <span aria-hidden="true">↗</span></a>' for label, href in g['links'])
    body = f'''<div class="article-layout"><article class="article sq-practical-article">
<header class="article-head"><div class="eyebrow">{e(g['category'])} · {e(g['topic'])}</div><h1>{e(g['title'])}</h1><p>{e(g['description'])}</p><div class="article-meta"><span class="pill live">Guide pratique</span><span class="pill">{e(g['time'])}</span></div></header>
<div class="sq-guide-summary"><span>Quand utiliser ce guide</span><p>{e(g['signal'])}</p></div>
<section class="doc-block" id="etapes"><h2>Les étapes à suivre</h2><ol class="sq-step-list">{steps}</ol></section>
<section class="doc-block sq-result-block" id="resultat"><h2>Résultat attendu</h2><p>{e(g['success'])}</p></section>
<section class="doc-block" id="si-besoin"><h2>Si le problème continue</h2><p>{e(g['escalate'])}</p><p><a class="btn green" href="support.html">Ouvrir une demande privée →</a></p></section>
<section class="doc-block sq-guide-links" id="aller-plus-loin"><h2>Pour aller plus loin</h2><div>{links}</div></section>
</article><aside class="aside-toc" id="articleToc"></aside></div>'''
    return head(g['title'], g['description']) + frame(g['title'], body, 'sq-guide-page')


def hub():
    sections = []
    for key, anchor in [('Workspace', 'workspace'), ('Wix Studio', 'wix'), ('Help Center', 'aide')]:
        rows = [g for g in GUIDES if g['category'] == key]
        cards = ''.join(f'''<a class="sq-guide-card" href="{e(g['slug'])}.html"><span class="sq-guide-card-top"><span>{e(g['topic'])}</span><small>{e(g['time'])}</small></span><strong>{e(g['title'])}</strong><p>{e(g['description'])}</p><span class="sq-guide-card-link">Suivre le guide <span aria-hidden="true">↗</span></span></a>''' for g in rows)
        sections.append(f'<section class="section sq-guide-category" id="{anchor}"><div class="section-head"><div><span class="sq-section-index">{e(key)}</span><h2>{"Résoudre un problème dans Workspace" if key == "Workspace" else "Créer et publier dans Wix Studio" if key == "Wix Studio" else "Obtenir de l’aide"}</h2></div></div><div class="sq-guide-card-grid">{cards}</div></section>')
    body = '''<section class="sq-guides-hero"><span class="sq-section-index">Bibliothèque pratique</span><h1>Un problème, un guide, une prochaine étape.</h1><p>Des parcours concrets pour avancer dans Workspace, Wix Studio et le centre d’aide.</p><div class="sq-guides-tabs"><a href="#workspace">Workspace</a><a href="#wix">Wix Studio</a><a href="#aide">Assistance</a></div></section>''' + ''.join(sections) + '<section class="section"><div class="banner"><div><h3>Votre situation n’est pas dans la liste ?</h3><p>Recherchez un terme précis ou utilisez le dépannage guidé pour choisir la prochaine action.</p></div><div class="banner-actions"><button class="btn" data-search-open>Rechercher</button><a class="btn green" href="diagnostic.html">Dépannage guidé</a></div></div></section>'
    return head('Guides pratiques', 'Guides pas à pas pour Workspace, Wix Studio et l’assistance Squared.') + frame('Guides pratiques', body, 'sq-guides-index')


def main():
    for g in GUIDES:
        (ROOT / f"{g['slug']}.html").write_text(article(g))
    (ROOT / 'guides.html').write_text(hub())

    index_path = ROOT / 'assets/knowledge-index.json'
    rows = [r for r in json.loads(index_path.read_text()) if r.get('href') != 'guides.html' and not str(r.get('href', '')).startswith('guide-')]
    rows.append(dict(kind='knowledge', title='Guides pratiques', description='Parcours pas à pas pour Workspace, Wix Studio et le centre d’aide.', content=' '.join(g['title'] + ' ' + g['description'] for g in GUIDES), href='guides.html', category='Help Center', featured=True))
    for g in GUIDES:
        text = ' '.join([g['title'], g['description'], g['signal'], g['success'], g['escalate']] + [a + ' ' + b for a, b in g['steps']])
        rows.append(dict(kind='knowledge', title=g['title'], description=g['description'], content=text, href=g['slug'] + '.html', category=g['category'], featured=g['slug'] in {'guide-acces-workspace', 'guide-document-introuvable', 'guide-wix-mobile'}))
    index_path.write_text(json.dumps(rows, ensure_ascii=False, separators=(',', ':')))

    sitemap_path = ROOT / 'sitemap.xml'
    sitemap = sitemap_path.read_text()
    for path in ['', 'quick-guides.html']:
        old = f'<loc>https://docs.squaredgroup.studio/{path}</loc><lastmod>2026-09-18</lastmod>'
        sitemap = sitemap.replace(old, f'<loc>https://docs.squaredgroup.studio/{path}</loc><lastmod>2026-09-24</lastmod>')
    additions = ''.join(f'<url><loc>https://docs.squaredgroup.studio/{path}</loc><lastmod>2026-09-24</lastmod></url>' for path in ['guides.html'] + [g['slug'] + '.html' for g in GUIDES] if 'https://docs.squaredgroup.studio/' + path not in sitemap)
    sitemap_path.write_text(sitemap.replace('</urlset>', additions + '</urlset>'))
    print(f'Built {len(GUIDES)} practical guides, the hub, search index and sitemap.')


if __name__ == '__main__':
    main()
