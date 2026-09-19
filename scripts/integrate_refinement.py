"""Idempotent visual delivery. Only markup/design is changed, never backend data.
Order: legacy styles > refinement > mobile layout contract.
"""
from pathlib import Path
import os,re
ROOT=Path(__file__).resolve().parents[1]
VERSION='20260919.1'
changed=[]
for page in sorted(ROOT.rglob('*.html')):
    if any(p in {'.git','node_modules','test-results'} for p in page.relative_to(ROOT).parts):continue
    original=text=page.read_text(encoding='utf-8')
    if 'assets/sidebar.css' not in text:continue
    assert 'data-sq-responsive' in text, f'Mobile layout contract missing: {page}'
    css=Path(os.path.relpath(ROOT/'assets/refinement.css',page.parent)).as_posix()
    js=Path(os.path.relpath(ROOT/'assets/refinement.js',page.parent)).as_posix()
    if 'data-sq-refinement-style' not in text:
        text,n=re.subn(r'(<link\b[^>]*data-sq-responsive[^>]*>)',f'<link rel="stylesheet" href="{css}?v={VERSION}" data-sq-refinement-style>\n\\1',text,count=1)
        assert n==1, f'Responsive CSS anchor missing: {page}'
    if 'data-sq-refinement-script' not in text:
        text=text.replace('</body>',f'<script defer src="{js}?v={VERSION}" data-sq-refinement-script></script>\n</body>',1)
    if page == ROOT/'index.html':
        text=text.replace('<title>Squared Help Center — Squared Help Center</title>','<title>Centre d’aide — Squared Group</title>')
        text=text.replace('Une seule interface pour trouver une réponse, apprendre un produit, poser une question ou obtenir une aide privée.','Des guides clairs, une communauté et une aide privée pour avancer avec Squared.')
        text=text.replace('Explorer la documentation','Trouvez votre point de départ')
        text=text.replace('Les domaines essentiels du Help Center.','Explorez les guides par produit et par besoin.')
        # Avoid decorative counts that become incorrect as documentation grows.
        text=re.sub(r'(<span class="cat-count">)\d+ guides(</span>)',r'\1Documentation\2',text)
        text=text.replace('<span class="cat-count">Ops</span>','<span class="cat-count">Méthodes</span>')
        # Links instead of a fake green "tracking active" status.
        if 'Suivi actif' in text:
            text=text.replace('<strong>Services</strong><span class="status-orb"></span>','<strong>L’écosystème Squared</strong><span data-icon-key="status" aria-hidden="true"></span>')
            products=['Squared Group','Squared Workspace','Help Center','Backend & communauté']
            for name in products:
                text=text.replace(f'<span>{name}</span><em>Suivi actif</em>',f'<a href="server-status.html"><span>{name}</span><small>Voir les mesures →</small></a>')
    if original!=text:
        page.write_text(text,encoding='utf-8');changed.append(str(page.relative_to(ROOT)))
print(f'Visual refinement integrated into {len(changed)} pages.')
