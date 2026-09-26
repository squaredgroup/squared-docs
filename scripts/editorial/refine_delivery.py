"""Apply reviewed presentation and asynchronous-test fixes to imported sources."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
def replace(path, old, new):
    p=ROOT/path; text=p.read_text()
    if new in text:return
    if old not in text:raise ValueError('Reviewed source changed: '+path)
    p.write_text(text.replace(old,new,1))

def main():
    replace('scripts/editorial/build.py',
        'Choisissez votre situation. Les parcours sont accessibles même sans JavaScript et n’accordent aucun droit supplémentaire.',
        'Choisissez votre situation pour retrouver les guides utiles, dans le bon ordre, et avancer à votre rythme.')
    replace('assets/docs.js',
        "        '<span>·</span><span>'+difficulty+'</span>'+\n        '<span>·</span><span>Consultez la date de révision du guide</span>';",
        "        (article.dataset.editorialCurated==='true'?'':'<span>·</span><span>'+difficulty+'</span><span>·</span><span>Consultez la date de révision du guide</span>');")
    replace('assets/editorial-intelligence.js',
        "if(!H||!a)return;const path=",
        "if(!H||!a)return;if(a.dataset.editorialCurated==='true'){window.SQEditorialIntelligence={version:'20260926.1',curated:true};return;}const path=")
    replace('assets/docs.js','    article.appendChild(tools);',
        "    if(article.dataset.editorialCurated!=='true')article.appendChild(tools);")
    replace('tests/editorial_browser.py',
        "  if not page.locator('h1').is_visible():failures.append({'test':'no JS','path':name})\n  else:checks.append('Readable without JavaScript '+name)",
        "  try:\n   page.locator('h1').wait_for(state='visible',timeout=6000)\n   assert len(page.locator('main').inner_text())>350\n   checks.append('Readable without JavaScript '+name)\n  except Exception as exc:\n   page.screenshot(path=str(OUT/('editorial-nojs-'+name.replace('/','-')+'.png')),full_page=True)\n   failures.append({'test':'no JS','path':name,'error':str(exc)[:300],'headings':page.locator('h1').evaluate_all('(els)=>els.map(e=>({text:e.textContent,rect:e.getBoundingClientRect().toJSON(),visibility:getComputedStyle(e).visibility}))')})")
    replace('tests/editorial_browser.py',
        "   assert page.locator('aside#sidebar').count()==1\n   assert not errors,errors",
        "   assert page.locator('aside#sidebar').count()==1\n   if page.locator('article[data-editorial-curated=true]').count():\n    assert page.locator('.article-feedback-v5').count()==1\n    assert page.locator('.sq-article-feedback-v8,.sq-article-context,.article-tools').count()==0\n   assert not errors,errors")
    replace('scripts/editorial/verify_public.py',
        "pool.map(verify,manifest['generated_paths'])",
        "pool.map(verify,manifest['generated_paths']+['changelog.html'])")
    replace('scripts/editorial/build.py',
        " if 'data-sq-editorial-members' not in text:text=text.replace('</head>',css+'\\n</head>',1)\n return text",
        ' if \'data-sq-editorial-members\' not in text:text=text.replace(\'</head>\',css+\'\\n</head>\',1)\n text=re.sub(r\'(src="(?:\\.\\./)?assets/(?:docs|sidebar|assistance|editorial-intelligence|help-core)\\.js)(?:\\?[^\"]*)?"\',r\'\\1?v=20260926.1"\',text)\n return text')
    replace('scripts/editorial/verify_public.py',
        "  return {'path':path,'http':code,'same_title':same_title",
        "  if path=='changelog.html':\n   wanted=expected.select_one('[data-editorial-release]');present=actual.select_one('[data-editorial-release]')\n   content_equal=bool(wanted and present and wanted.get_text(' ',strip=True)==present.get_text(' ',strip=True))\n  return {'path':path,'http':code,'same_title':same_title")
    p=ROOT/'content/editorial-charter.md';text=p.read_text()
    if 'Le flux public de contenu Workspace' not in text:
        sentence="Le flux public de contenu Workspace est une troisième surface de publication déjà intégrée au Help Center. Les entrées qui renvoient vers un guide HTML restent des références, pas de nouvelles copies de cet article. Les FAQ et les contenus structurés publiés depuis Workspace conservent leur source et leurs contrôles d’accès. Cette livraison ne les réécrit pas en base."
        text=text.replace('## Processus de publication',sentence+'\n\n## Processus de publication',1)
        p.write_text(text)
    p=ROOT/'README.md';text=p.read_text()
    if '## Édition membres — septembre 2026' not in text:
        head,sep,tail=text.partition('\n')
        section='''

## Édition membres — septembre 2026

Le corpus éditorial comprend 26 nouveaux articles et 44 articles réécrits, quatre parcours de lecture et 16 réponses FAQ statiques. Les guides existants conservés, les trois articles Supabase et le flux public Workspace gardent leurs sources et leurs adresses.

- [Charte éditoriale](content/editorial-charter.md)
- [Modèles de rédaction](content/editorial-templates.md)
- [Registre des contenus](content/editorial-register.csv)
- [Décisions à confirmer](content/editorial-decisions.md)
- [Portée et limites de la livraison](content/editorial-delivery.md)

Les textes éditables sont dans `content/editorial/`. Après modification, installer `scripts/editorial/requirements.txt`, puis exécuter `python scripts/editorial/build.py` et `python tests/editorial_contract.py`. Le workflow **Member Editorial Quality** contrôle les pages, les liens, la recherche, la lecture sans JavaScript et le rendu navigateur. Sur `main`, il vérifie aussi le HTML public déployé. Les paiements, comptes réels, applications natives et engagements commerciaux ne sont pas validés par ces tests.
'''
        p.write_text(head+section+'\n'+tail)
    p=ROOT/'changelog.html';text=p.read_text()
    if 'data-editorial-release="20260926"' not in text:
        block='<div class="update" data-change-type="improved" data-editorial-release="20260926"><time>26.09.2026</time><div><strong>Des parcours complets pour les membres</strong><p>26 nouveaux articles et 44 guides réécrits pour les clients, les collaborateurs et les utilisateurs. Parcours Workspace et Build, glossaire, FAQ approfondie et recherche enrichie. Les adresses historiques sont conservées et les procédures précisent leurs limites.</p><p><a href="parcours.html">Choisir votre parcours</a> · <a href="guides.html">Explorer les guides</a></p></div><span class="version">Contenus</span></div>'
        if '<div class="timeline">' not in text:raise ValueError('Changelog template changed')
        p.write_text(text.replace('<div class="timeline">','<div class="timeline">'+block,1))

if __name__=='__main__':main()
