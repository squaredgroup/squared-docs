"""Finish integration after the generated pages exist. Idempotent and frontend-only.
Legacy Wix has its own header and long-content CSS, so keep its fixes scoped.
"""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
def patch(path,change):
 p=ROOT/path;s=p.read_text();p.write_text(change(s))
patch('wix-studio.html',lambda s:s.replace('<body>', '<body data-wix-guide>').replace('class="top-link"','class="top-link hide-mobile"').replace('class="crumb" id="crumb"','class="crumb crumbs" id="crumb"'))
css='''
/* Legacy monolithic Wix guide: shrink content tracks rather than hiding document overflow. */
@media(max-width:860px){
 body[data-wix-guide] .topbar .top-link,body[data-wix-guide] .topbar #printBtn{display:none!important}
 body[data-wix-guide] .topbar .crumb{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 body[data-wix-guide] :is(.content,.doc-section,.module-label,.module-label-inner,.module-meta,.section-header){min-width:0;max-width:100%}
 body[data-wix-guide] :is(.module-meta,.section-end,.hero-actions,.docs-library-head){flex-wrap:wrap}
 body[data-wix-guide] .callout{grid-template-columns:8px minmax(0,1fr)}
 body[data-wix-guide] .step-list li{grid-template-columns:30px minmax(0,1fr);gap:10px}
 body[data-wix-guide] :is(.step-list span,.callout>div,.source-link>span,.check-item>span){min-width:0;overflow-wrap:anywhere}
 body[data-wix-guide] :is(.doc-section h1,.doc-section h2,.doc-section h3){overflow-wrap:anywhere}
 body[data-wix-guide] .table-wrap{width:100%;max-width:100%;margin-left:0;margin-right:0;overflow-x:auto}
}
'''
patch('assets/assistance.css',lambda s:s if 'Legacy monolithic Wix guide:' in s else s+css)
# Replace the generic continuation card for the six updated guides; avoid stacked duplicates.
patch('assets/assistance.js',lambda s:s.replace("box.append(community);article.append(box);", "box.append(community);const previous=article.querySelector('.article-tools');if(previous)previous.replaceWith(box);else article.append(box);").replace("if(!me||!['admin','moderator'].includes(me.role))return;", "if(!me||me.is_banned||!['admin','moderator'].includes(me.role))return;"))
# Failure evidence includes bounds, not a relaxed overflow assertion.
p=ROOT/'tests/assistance_journeys.py';s=p.read_text()
old="    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),(engine,width,path,'overflow')"
new="""    if not page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'):
     page.screenshot(path=str(OUT/f'overflow-{engine}-{width}.png'))
     bounds=page.evaluate('''[...document.body.querySelectorAll('*')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,id:e.id,cls:e.className?.baseVal||e.className,left:r.left,right:r.right,width:r.width,display:s.display,position:s.position};}).filter(x=>x.width>0&&x.display!=='none'&&(x.right>innerWidth+2||x.left< -2)).slice(0,80)''')
     (OUT/'overflow-bounds.json').write_text(json.dumps({'engine':engine,'width':width,'page':path,'bounds':bounds},ensure_ascii=False,indent=2))
     raise AssertionError((engine,width,path,'overflow',bounds[:6]))"""
if old in s:s=s.replace(old,new)
s=s.replace("   if issue=='documents':page.screenshot(path=str(OUT/f'journey-diagnostic-{engine}.png'),full_page=True)", "   if issue=='documents':\n    page.evaluate('document.activeElement?.blur();window.scrollTo({top:0,behavior:\"instant\"})');page.wait_for_timeout(80);page.screenshot(path=str(OUT/f'journey-diagnostic-{engine}.png'),full_page=True)")
p.write_text(s)
# Public release notes describe shipped behavior, never a made-up measured uptime or usage count.
p=ROOT/'changelog.html';s=p.read_text()
if 'Parcours d’assistance' not in s:
 s=s.replace('<div class="timeline">','<div class="timeline"><div class="update" data-change-type="improved"><time>19.09.2026</time><div><strong>Parcours d’assistance</strong><p>Entrées par besoin, dépannage guidé sans envoi automatique, vue support adaptée à la session, guides Workspace vérifiés, recherche avec provenance et avertissement de mode partiel, apparence Clair/Sombre/Système.</p></div><span class="version">Parcours</span></div>',1)
p.write_text(s)
p=ROOT/'README.md';s=p.read_text()
if 'ASSISTANCE-JOURNEYS.md' not in s:s+='\n\n## Parcours d’assistance\n\nLa livraison du 19 septembre ajoute les parcours par besoin, le diagnostic guidé, la recherche à sources explicites et six guides Workspace vérifiés. Voir [ASSISTANCE-JOURNEYS.md](ASSISTANCE-JOURNEYS.md) pour la portée, les sources des captures, les tests et les limites.\n'
p.write_text(s)
print('Assistance finishing changes integrated without weakening layout checks.')
