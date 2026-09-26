"""Generate public member documentation from reviewed sources; no network or database writes.
Run from any directory: python scripts/editorial/build.py
"""
from __future__ import annotations
from pathlib import Path, PurePosixPath
from html import escape
from urllib.parse import urlsplit
import csv, hashlib, importlib.util, json, re, unicodedata, xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from markdown_it import MarkdownIt

ROOT=Path(__file__).resolve().parents[2]
DATE='2026-09-26'
MARKER='member-editorial-20260926'
MD=MarkdownIt('commonmark',{'html':False,'linkify':False,'typographer':False})
SCOPE='Workspace web : les commandes et les accès peuvent différer dans les applications natives.'
BASE=json.loads((ROOT/'content/editorial-baseline.json').read_text())
BASEMAP={x['path']:x for x in BASE}
ANCHORS=json.loads((ROOT/'content/editorial-legacy-anchors.json').read_text())
PROVENANCE=json.loads((ROOT/'content/editorial-provenance.json').read_text())

spec=importlib.util.spec_from_file_location('practical_frame',ROOT/'scripts/build_practical_guides.py')
frame_mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(frame_mod)

def jread(p):return json.loads(p.read_text(encoding='utf-8'))
def write(path,text):
 p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text,encoding='utf-8')
def dump(path,obj):write(path,json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def slug(value):
 return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',value).encode('ascii','ignore').decode().lower()).strip('-') or 'section'
def prefix(path):return '../'*(len(PurePosixPath(path).parts)-1)
def href(value,path):
 u=urlsplit(value)
 if u.scheme and u.scheme not in {'https','http','mailto'}: raise ValueError('Unsafe link scheme: '+value)
 if u.scheme or value.startswith('#'):return value
 if value.startswith('//') or value.startswith('/') or '..' in PurePosixPath(u.path).parts:raise ValueError('Use site-root source links: '+value)
 return prefix(path)+value

def markdown(source,path):
 rendered=MD.render(source)
 soup=BeautifulSoup(rendered,'html.parser')
 for a in soup.select('a[href]'):a['href']=href(a['href'],path)
 if soup.find(['script','iframe','style']):raise ValueError('Executable content in article')
 return str(soup)

def load_articles():
 rows=[]
 for p in sorted((ROOT/'content/editorial').glob('*.json')):
  for a in jread(p):a={**a,'source':p.relative_to(ROOT).as_posix()};rows.append(a)
 names=[x['path'] for x in rows]
 if len(names)!=len(set(names)):raise ValueError('Duplicate canonical source')
 for a in rows:
  p=PurePosixPath(a['path'])
  if p.is_absolute() or '..' in p.parts or p.suffix!='.html':raise ValueError('Invalid public path')
 return rows

def article_markup(a):
 p=a['path'];segments=re.split(r'^## (.+)\n',a['body'],flags=re.M)
 if segments[0].strip():raise ValueError('Article must start with a section: '+p)
 taken=set();parts=[]
 for i in range(1,len(segments),2):
  label,body=segments[i],segments[i+1];ident=slug(label);base=ident;n=2
  while ident in taken:ident=f'{base}-{n}';n+=1
  taken.add(ident);parts.append([ident,label,body])
 aliases=[x for x in ANCHORS.get(p,[]) if x not in taken]
 sections=[]
 for i,(ident,label,body) in enumerate(parts):
  alias=''.join(f'<span class="sq-legacy-anchor" id="{escape(x,quote=True)}" aria-hidden="true"></span>' for n,x in enumerate(aliases) if min(n,len(parts)-1)==i)
  sections.append(f'<section class="doc-block" id="{ident}">{alias}<h2>{escape(label)}</h2>{markdown(body,p)}</section>')
 scope=SCOPE if a['category']=='Workspace' and a['proof']=='code-reviewed' else ('Build web : distinguez les données locales, les accès à la formation et la synchronisation disponible.' if a['category']=='Squared Build' else '')
 scope_html=f'<p class="sq-editorial-scope">{escape(scope)}</p>' if scope else ''
 guide_route={'Clients':'client','Collaboration':'equipe','Workspace':'applications','Squared Build':'build'}.get(a['category'],'')
 journey=f'parcours.html?profil={guide_route}' if guide_route else 'parcours.html'
 related=f'<nav class="sq-editorial-next" aria-label="Continuer votre parcours"><a class="btn" href="{href(journey,p)}">Retrouver votre parcours</a><a class="btn" href="{href("guides.html",p)}">Tous les guides pratiques</a><a class="btn" href="{href("support.html",p)}">Obtenir de l’aide en privé</a></nav>'
 return f'''<article class="article sq-editorial-article" data-editorial-source="{escape(a['source'])}" data-editorial-version="{MARKER}" data-editorial-category="{escape(a['category'])}" data-editorial-curated="true">
<header class="article-head"><div class="eyebrow">{escape(a['category'])} · Documentation</div><h1>{escape(a['title'])}</h1><p>{escape(a['summary'])}</p><div class="article-meta"><span class="pill">{escape(a['kind'])}</span><span class="pill">Contenu relu · 26.09.2026</span></div></header>
<div class="sq-editorial-audience"><span>Pour qui ?</span><strong>{escape(a['audience'])}</strong></div>{scope_html}
{''.join(sections)}{related}</article>'''

def add_style(text):
 css='<link rel="stylesheet" href="assets/editorial-members.css?v=20260926.1" data-sq-editorial-members>'
 if 'data-sq-editorial-members' not in text:text=text.replace('</head>',css+'\n</head>',1)
 text=re.sub(r'(src="(?:\.\./)?assets/(?:docs|sidebar|assistance|editorial-intelligence|help-core)\.js)(?:\?[^"]*)?"',r'\1?v=20260926.1"',text)
 return text

def generate_article(a):
 p=ROOT/a['path'];markup=article_markup(a)
 if p.exists():
  text=p.read_text()
  if not re.search(r'<article\b',text):raise ValueError('Refuse to replace non-article interface: '+a['path'])
  text,n=re.subn(r'<article\b[^>]*>.*?</article>',lambda _:markup,text,count=1,flags=re.S)
  assert n==1
  text=re.sub(r'<title>.*?</title>',lambda _:'<title>'+escape(a['title'])+' — Squared Help Center</title>',text,count=1,flags=re.S)
  text=re.sub(r'<meta name="description" content="[^"]*"\s*/?>',lambda _:'<meta name="description" content="'+escape(a['summary'],quote=True)+'">',text,count=1)
 else:
  body='<div class="article-layout">'+markup+'<aside class="aside-toc" id="articleToc"></aside></div>'
  text=frame_mod.head(a['title'],a['summary'])+frame_mod.frame(a['title'],body,'sq-guide-page')
  if prefix(a['path']):raise ValueError('A new nested page needs a relative frame')
 text=add_style(text).replace('href="assets/editorial-members.css','href="'+prefix(a['path'])+'assets/editorial-members.css')
 # Source hashes are reproducible; no false deployment timestamp.
 write(a['path'],text)

def card(a):
 return f'<a class="sq-guide-card" href="{escape(a["path"])}"><span class="sq-guide-card-top"><span>{escape(a["category"])}</span><small>{escape(a.get("kind","Guide"))}</small></span><strong>{escape(a["title"])}</strong><p>{escape(a["summary"])}</p><span class="sq-guide-card-link">Lire le guide <span aria-hidden="true">↗</span></span></a>'

def guides(articles):
 bypath={a['path']:a for a in articles};legacy=jread(ROOT/'content/practical-guides.json')
 catalog=[a for a in articles if a['path'].startswith('guide-')]
 catalog += [dict(path=g['slug']+'.html',title=g['title'],summary=g['description'],category=g['category'],kind='Dépannage') for g in legacy if g['slug']+'.html' not in bypath]
 groups=[('Clients','clients','Démarrer et suivre votre projet'),('Collaboration','collaboration','Comprendre, produire et transmettre'),('Workspace','workspace','Réaliser une action ou résoudre un blocage'),('Squared Build','build','Accéder à une formation et protéger votre carnet'),('Help Center','aide','Participer et obtenir de l’aide'),('Wix Studio','wix','Modifier et publier un site')]
 body='<section class="sq-guides-hero"><span class="sq-section-index">Bibliothèque pratique</span><h1>Des réponses pour chaque étape.</h1><p>Choisissez votre situation, réalisez les vérifications et retrouvez la prochaine action.</p><div class="sq-guides-tabs">'+''.join(f'<a href="#{i}">{escape(c)}</a>' for c,i,t in groups)+'</div></section>'
 for cat,ident,title in groups:
  rows=[a for a in catalog if a['category']==cat]
  body+=f'<section class="section sq-guide-category" id="{ident}"><div class="section-head"><div><span class="sq-section-index">{escape(cat)}</span><h2>{escape(title)}</h2></div></div><div class="sq-guide-card-grid">'+''.join(card(a) for a in rows)+'</div></section>'
 body+='<section class="section"><div class="banner"><div><h2>Besoin d’un point de départ ?</h2><p>Choisissez votre parcours ou consultez les notions utilisées dans les guides.</p></div><div class="banner-actions"><a class="btn green" href="parcours.html">Votre parcours</a><a class="btn" href="ecosysteme.html">Les espaces Squared</a><a class="btn" href="glossaire.html">Glossaire</a></div></div></section>'
 body+='<section class="section"><h2>Documentation de référence</h2><div class="sq-guides-tabs">'+''.join(f'<a href="{p}">{t}</a>' for p,t in [('workspace.html','Workspace'),('build.html','Build'),('wix-studio.html','Wix Studio'),('design-system.html','Design System'),('development.html','Développement'),('security.html','Sécurité'),('process.html','Méthodes de travail')])+'</div></section>'
 text=frame_mod.head('Guides pratiques','Guides clients, collaborateurs, Workspace, Build et assistance Squared.')+frame_mod.frame('Guides pratiques',body,'sq-guides-index')
 write('guides.html',add_style(text));return len(catalog)

JOURNEYS={
 'client':('Démarrer et suivre votre projet','De la préparation à la remise des livrables, avec les bons accès et les bonnes décisions.',[
 ('Préparer le démarrage','guide-client-demarrage.html'),('Activer votre accès','workspace/workspace-activation.html'),('Suivre le projet','workspace/workspace-projects.html'),('Transmettre vos contenus','guide-client-contenus.html'),('Faire un retour','guide-client-retours.html'),('Valider le bon élément','guide-client-validation.html'),('Récupérer vos livrables','guide-client-livraison.html'),('Obtenir de l’aide après livraison','guide-client-suivi.html')]),
 'equipe':('Travailler avec Squared','Comprenez le périmètre, réalisez votre travail et transmettez un résultat exploitable.',[
 ('Préparer votre arrivée','guide-collaborateur-premiers-pas.html'),('Comprendre la mission','guide-collaborateur-mission.html'),('Mettre à jour une tâche','workspace/workspace-tasks.html'),('Organiser les fichiers','guide-collaborateur-fichiers.html'),('Signaler un blocage','guide-collaborateur-blocage.html'),('Remettre pour validation','guide-collaborateur-validation.html'),('Terminer et transmettre','guide-collaborateur-fin-mission.html')]),
 'applications':('Utiliser Workspace','Choisissez le bon accès puis les guides de la version web et de votre appareil.',[
 ('Installer ou ouvrir Workspace','workspace/workspace-installation.html'),('Retrouver la connexion','workspace/workspace-login.html'),('Se repérer dans l’espace','workspace/workspace-navigation.html'),('Suivre un projet','workspace/workspace-projects.html'),('Retrouver un document','guide-document-introuvable.html'),('Traiter une validation','guide-workspace-validations.html'),('Préserver une saisie','guide-workspace-connexion-saisie.html'),('Résoudre un problème','diagnostic.html')]),
 'build':('Apprendre avec Build','Accès, lecture et carnet : progressez sans confondre vos comptes ni vos sauvegardes.',[
 ('Comprendre Build','build.html'),('Choisir une formation','guide-build-choisir.html'),('Retrouver votre accès','guide-build-acces.html'),('Lire une leçon','guide-build-lecture.html'),('Protéger le carnet','guide-build-carnet.html'),('Résoudre un problème','guide-build-depannage.html')])}

def journeys():
 body='<section class="sq-guides-hero"><span class="sq-section-index">Votre parcours</span><h1>Votre prochaine étape commence ici.</h1><p>Choisissez votre situation. Les parcours sont accessibles même sans JavaScript et n’accordent aucun droit supplémentaire.</p><div class="sq-guides-tabs">'+''.join(f'<a href="#{key}">{escape(data[0])}</a>' for key,data in JOURNEYS.items())+'</div></section><div id="journeyMount" data-editorial-static="true">'
 for key,(title,desc,steps) in JOURNEYS.items():
  body+=f'<section class="sq-journey-panel" id="{key}" data-journey="{key}"><span class="sq-section-index">Parcours</span><h2>{escape(title)}</h2><p>{escape(desc)}</p><ol class="sq-guide-steps">'+''.join(f'<li><a class="sq-guide-link" href="{p}">{escape(t)}</a></li>' for t,p in steps)+'</ol><a class="sq-text-link" href="parcours.html">Tous les parcours</a></section>'
 body+='</div><section class="section"><div class="banner"><div><h2>Vous ne savez pas quel espace choisir ?</h2><p>Identifiez le service concerné avant de créer un compte ou d’ouvrir une demande.</p></div><a class="btn green" href="ecosysteme.html">Comprendre les espaces Squared</a></div></section>'
 text=frame_mod.head('Votre parcours','Parcours clients, collaborateurs, Workspace et Build : de la première étape à la résolution.')+frame_mod.frame('Votre parcours',body,'sq-guides-index')
 write('parcours.html',add_style(text))

FAQ=[
 ('Le compte du Help Center donne-t-il accès à Workspace ou à Build ?','Non. Les comptes et les droits doivent être vérifiés pour le service concerné. Une même adresse e-mail ne garantit pas un mot de passe partagé ni un accès à une formation.','ecosysteme.html'),
 ('Je n’ai pas reçu mon invitation Workspace. Que faire ?','Vérifiez l’adresse attendue et les courriers indésirables, puis demandez à votre interlocuteur de contrôler l’état de l’invitation. Ne créez pas plusieurs comptes pour contourner le problème.','workspace/workspace-activation.html'),
 ('Un projet ou une rubrique n’apparaît pas.','Vérifiez le compte et les filtres, puis faites contrôler le périmètre nécessaire. L’absence d’une rubrique peut correspondre à vos permissions ; le Help Center ne peut pas les attribuer.','guide-projet-invisible.html'),
 ('Je ne retrouve pas un document ou un livrable.','Consultez le bon projet, puis Documents et Livrables. Retirez les filtres avant de demander une vérification du partage. Ne recréez pas le fichier.','guide-document-introuvable.html'),
 ('Comment faire un retour utile sur une proposition ?','Identifiez la version, regroupez vos commentaires et distinguez les corrections des nouvelles demandes. Un message de réception ne vaut pas validation.','guide-client-retours.html'),
 ('Terminer une tâche valide-t-il le livrable ?','Non. La tâche décrit une action réalisée. La validation du livrable est une décision distincte, prise sur le bon élément et la bonne version par une personne habilitée.','guide-workspace-validations.html'),
 ('Que faire si ma mission manque de précisions ?','Demandez une clarification de l’objectif, du périmètre, de l’échéance ou du résultat attendu avant de produire. Ne remplacez pas une décision manquante par une supposition.','guide-collaborateur-mission.html'),
 ('Puis-je fermer une fenêtre après une erreur réseau ?','Protégez d’abord votre saisie et lisez le message exact. Un enregistrement non confirmé et une liste non actualisée après un enregistrement réussi nécessitent des actions différentes.','guide-workspace-connexion-saisie.html'),
 ('Où poser une question générale ?','Utilisez le forum pour les questions partageables et les retours d’expérience. Vérifiez les sujets existants et ne publiez aucune donnée client ni aucun secret.','guide-help-communaute.html'),
 ('Quand utiliser le support privé ?','Utilisez une demande privée pour un compte, un accès ou un contexte confidentiel. Partagez uniquement les informations nécessaires au diagnostic.','asking-for-help.html'),
 ('Comment retrouver une demande déjà ouverte ?','Connectez-vous au bon compte du Help Center et consultez vos tickets. Complétez l’échange existant plutôt que de créer une seconde demande pour le même problème.','my-tickets.html'),
 ('Comment savoir si un service rencontre un incident ?','Consultez l’état des services et l’ancienneté des informations. L’absence d’incident déclaré ne prouve pas que chaque fonction fonctionne sur chaque appareil.','status.html'),
 ('Ma formation Build n’apparaît pas dans ma bibliothèque.','Vérifiez le compte apprenant et les instructions d’accès reçues. Une bibliothèque vide ne signifie pas que vous devez payer de nouveau.','guide-build-acces.html'),
 ('Mes notes Build sont-elles disponibles sur tous mes appareils ?','Pas nécessairement. Distinguez le carnet local et une synchronisation réellement disponible pour votre compte. Exportez le carnet avant de changer de navigateur ou d’effacer ses données.','guide-build-carnet.html'),
 ('Une leçon marquée terminée délivre-t-elle un certificat ?','Le marquage suit votre progression. Il ne prouve pas une certification externe. Consultez les conditions de la formation pour toute attestation éventuellement annoncée.','guide-build-lecture.html'),
 ('Je ne trouve aucune réponse.','Recherchez le produit, l’action ou le message rencontré avec une autre formulation. Utilisez ensuite le dépannage guidé ou le canal adapté au caractère public ou privé de votre demande.','diagnostic.html')]

def faq():
 p=ROOT/'faq.html';text=p.read_text()
 header='<header class="article-head"><div class="eyebrow">Help Center · Réponses rapides</div><h1>Questions fréquentes</h1><p>Une réponse courte, puis le bon guide pour agir.</p><div class="article-meta"><span class="pill">FAQ</span><span class="pill">Contenu relu · 26.09.2026</span></div></header>'
 body='<div class="faq-stack">'+''.join(f'<details class="faq-item"'+(' open' if i==0 else '')+f'><summary>{escape(q)}</summary><div class="faq-answer"><p>{escape(a)}</p><p><a href="{escape(h)}">Consulter le guide lié à cette question</a></p></div></details>' for i,(q,a,h) in enumerate(FAQ))+'</div>'
 replacement=f'<article class="article" data-editorial-version="{MARKER}" data-editorial-curated="true">{header}{body}</article>'
 text=re.sub(r'<article\b[^>]*>.*?</article>',lambda _:replacement,text,count=1,flags=re.S)
 write('faq.html',add_style(text))

def integrate_navigation():
 p=ROOT/'assets/sidebar.js';s=p.read_text()
 needle=" {href:'getting-started.html',icon:'start',label:'Bien démarrer'},"
 addition="\n {href:'ecosysteme.html',icon:'group',label:'Les espaces Squared'},\n {href:'glossaire.html',icon:'book',label:'Glossaire'},"
 if "href:'ecosysteme.html'" not in s:
  if needle not in s:raise ValueError('Navigation changed; review insertion')
  s=s.replace(needle,needle+addition,1)
 needle=" {href:'design-system.html',icon:'design',label:'Design System',children:["
 entry=" {href:'build.html',icon:'book',label:'Squared Build',children:[{href:'guide-build-choisir.html',label:'Choisir une formation'},{href:'guide-build-acces.html',label:'Accès & bibliothèque'},{href:'guide-build-lecture.html',label:'Lecture & progression'},{href:'guide-build-carnet.html',label:'Carnet & sauvegardes'},{href:'guide-build-depannage.html',label:'Dépannage'}]},\n"
 if "href:'build.html'" not in s:
  if needle not in s:raise ValueError('Product navigation changed')
  s=s.replace(needle,entry+needle,1)
 write('assets/sidebar.js',s)
 p=ROOT/'assets/assistance.js';s=p.read_text()
 needle="const host=$('#journeyMount');if(!host)return;"
 replacement="const host=$('#journeyMount');if(!host)return;if(host.dataset.editorialStatic==='true'){const selected=new URLSearchParams(location.search).get('profil')||new URLSearchParams(location.search).get('type');const sections=[...host.querySelectorAll('[data-journey]')];if(sections.some(s=>s.dataset.journey===selected)){sections.forEach(s=>s.hidden=s.dataset.journey!==selected);}return;}"
 if "host.dataset.editorialStatic" not in s:
  if needle not in s:raise ValueError('Journey renderer changed')
  s=s.replace(needle,replacement,1)
 write('assets/assistance.js',s)
 p=ROOT/'assets/editorial-intelligence.js';s=p.read_text()
 s=s.replace("const product=guideCategory|| (", "const product=a.dataset.editorialCategory||guideCategory|| (")
 s=s.replace('if(rows.length){const s=',"if(rows.length&&a.dataset.editorialCurated!=='true'){const s=")
 write('assets/editorial-intelligence.js',s)
 p=ROOT/'assets/help-core.js';s=p.read_text().replace("'Aucun résultat pour cette recherche.'","'Aucun résultat pour cette recherche. Essayez le nom du produit, une rubrique ou le message d’erreur rencontré.'")
 write('assets/help-core.js',s)
 p=ROOT/'index.html';s=p.read_text().replace('Voir les 8 guides','Tous les guides pratiques').replace('01 / 08','GUIDES')
 if 'data-editorial-home' not in s:
  insert='<section class="section" data-editorial-home="true"><div class="section-head"><div><span class="sq-section-index">Votre parcours</span><h2>Avancer avec Squared</h2><p>Des étapes adaptées à votre collaboration et au service que vous utilisez.</p></div></div><div class="sq-guide-card-grid">'+''.join(card({'path':'parcours.html?profil='+k,'category':'Parcours','title':v[0],'summary':v[1],'kind':'Premiers pas'}) for k,v in JOURNEYS.items())+'</div></section>'
  pos=s.find('<footer class="footer"')
  if pos<0:raise ValueError('Homepage footer changed')
  s=s[:pos]+insert+s[pos:]
 write('index.html',add_style(s))


def refresh_index(articles):
 p=ROOT/'assets/knowledge-index.json';rows=jread(p);by={a['path']:a for a in articles}
 updated=set(by)|{'guides.html','parcours.html','faq.html','getting-started.html','index.html'}
 # Re-read all existing public articles to remove obsolete index excerpts, preserving chapter anchors.
 for path in BASEMAP:
  f=ROOT/path
  if f.exists() and BeautifulSoup(f.read_text(),'html.parser').select_one('article.article'):updated.add(path)
 keep=[r for r in rows if r.get('href') not in updated];seen={r.get('href') for r in keep}
 for path in sorted(updated):
  soup=BeautifulSoup((ROOT/path).read_text(),'html.parser');a=soup.select_one('article') or soup.select_one('main')
  if not a:continue
  title=a.find('h1');title=title.get_text(' ',strip=True) if title else soup.title.get_text(' ',strip=True).split(' — ')[0]
  meta=soup.select_one('meta[name=description]');desc=by.get(path,{}).get('summary') or (meta.get('content','') if meta else '')
  content=a.get_text(' ',strip=True)
  category=by.get(path,{}).get('category') or {'wix':'Wix Studio','workspace':'Workspace','design-system':'Design System','security':'Sécurité','development':'Développement'}.get(path.split('/')[0],'Help Center')
  keep.append(dict(kind='knowledge',title=title,description=desc,content=content,href=path,category=category,featured=path in {'guides.html','parcours.html','getting-started.html','ecosysteme.html','build.html','workspace/workspace-tasks.html'}))
 # A single canonical row for each href; old chapter rows remain distinct.
 unique={}
 for r in keep: unique[r['href']]=r
 write('assets/knowledge-index.json',json.dumps(list(unique.values()),ensure_ascii=False,separators=(',',':'))+'\n')
 return len(unique)

def sitemap(articles):
 p=ROOT/'sitemap.xml';s=p.read_text()
 for path in [a['path'] for a in articles]+['guides.html','parcours.html','faq.html']:
  loc='https://docs.squaredgroup.studio/'+path
  pattern=r'(<url>\s*<loc>'+re.escape(loc)+r'</loc>)(.*?)(</url>)'
  def repl(m):
   inner=m[2]
   if re.search(r'<lastmod>.*?</lastmod>',inner):inner=re.sub(r'<lastmod>.*?</lastmod>',f'<lastmod>{DATE}</lastmod>',inner)
   else:inner=f'<lastmod>{DATE}</lastmod>'+inner
   return m[1]+inner+m[3]
  if loc+'</loc>' in s:s=re.sub(pattern,repl,s,flags=re.S)
  else:s=s.replace('</urlset>',f'<url><loc>{loc}</loc><lastmod>{DATE}</lastmod></url>\n</urlset>')
 write('sitemap.xml',s)

def register(articles,guide_count,index_count):
 by={a['path']:a for a in articles};rows=[]
 for path in sorted(set(BASEMAP)|set(by)|{'guides.html','parcours.html','faq.html'}):
  a=by.get(path);base=BASEMAP.get(path)
  if a:
   decision='Réécrire et compléter' if base else 'Créer';kind='Article';aud=a['audience'];need=a['summary'];proof=a['proof'];priority=a['priority'];source=a['source'];title=a['title'];state='Rédigé et généré'
  else:
   kind='Article conservé' if base and base['kind']=='article' else 'Interface / orientation';aud='Selon la page';need='Préserver la source et le parcours existants';proof='non réexécuté en production';priority='P2';source=path;title=base['title'] if base else path;state='Conservé'
   decision='Conserver'
   if path in {'guides.html','parcours.html','faq.html','index.html'}:decision='Compléter l’orientation';state='Généré';proof='structure et liens';priority='P0'
  rows.append(dict(path=path,title=title,type=kind,audience=aud,need=need,decision=decision,priority=priority,source=source,status=state,verification=proof,content_review=DATE if a else '',follow_up_role='Responsable du contenu / produit à attribuer',private=False))
 for m in PROVENANCE['managed_articles']:
  rows.append(dict(path=m['href'],title=m['title'],type='Article administrable',audience='Membres du Help Center',need='Conserver la référence sans copie statique',decision=m['decision'],priority='P0',source='Éditeur Supabase existant',status='Source conservée',verification='Métadonnées lues ; corps non modifié',content_review='',follow_up_role='Responsable éditorial à attribuer',private=False))
 dump('content/editorial-register.json',rows)
 with (ROOT/'content/editorial-register.csv').open('w',encoding='utf-8-sig',newline='') as f:
  writer=csv.DictWriter(f,fieldnames=list(rows[0]),delimiter=';');writer.writeheader();writer.writerows(rows)
 first12=[('Quel espace utiliser','ecosysteme.html'),('Connexion','workspace/workspace-login.html'),('Suivre une demande privée','article.html?id=beee7bb0-8b0b-439e-8f48-760b3595dd9b'),('Démarrage client','guide-client-demarrage.html'),('Retours client','guide-client-retours.html'),('Documents et livrables','workspace/workspace-documents.html'),('Comprendre une mission','guide-collaborateur-mission.html'),('Signaler un blocage','guide-collaborateur-blocage.html'),('Remise pour validation','guide-collaborateur-validation.html'),('Navigation Workspace','workspace/workspace-navigation.html'),('Suivi de projet','workspace/workspace-projects.html'),('Tâches','workspace/workspace-tasks.html')]
 manifest={'release':MARKER,'content_review_date':DATE,'new_articles':sum(a['path'] not in BASEMAP for a in articles),'rewritten_articles':sum(a['path'] in BASEMAP for a in articles),'authored_articles':len(articles),'authored_words':sum(len(a['body'].split()) for a in articles),'practical_library_cards':guide_count,'index_entries':index_count,'faq_questions':len(FAQ),'journeys':{k:[p for t,p in v[2]] for k,v in JOURNEYS.items()},'initial12':[{'need':n,'canonical':p} for n,p in first12],'generated_paths':sorted([a['path'] for a in articles]+['guides.html','parcours.html','faq.html','index.html']),'article_paths':[a['path'] for a in articles],'managed_sources_preserved':3,'deployment_status':'À confirmer par le déploiement et les contrôles en ligne ; ce fichier décrit le build, pas une preuve de publication.'}
 dump('content/editorial-manifest.json',manifest)
 lines=['# Livraison éditoriale membres','',f'Version source : `{MARKER}`.', '',f'{manifest["new_articles"]} nouveaux articles et {manifest["rewritten_articles"]} articles réécrits. {len(FAQ)} réponses de FAQ. Quatre parcours statiques. Trois sources administrables conservées sans duplication.','', '## Périmètre','', 'Clients, collaborateurs, Workspace web, Help Center, Build, Wix Studio, Design System, développement et sécurité. Les 29 chapitres du manuel Wix et les guides d’accès déjà approfondis sont conservés. Les pages de service et les données privées ne sont pas réinitialisées.', '', '## Vérification', '', 'La relecture de code et de méthode est distincte des tests de rendu et de parcours. Les rapports de tests et les contrôles de publication doivent être consultés avant de considérer le déploiement comme confirmé. Aucun paiement réel, aucune invitation, aucun ticket ni aucune modification de rôle n’est exécuté pour produire cette documentation.', '', '## Sources et entretien','', '`editorial-register.csv` et `.json` recensent les décisions par page. `editorial-provenance.json` conserve les sources et limites. `editorial-charter.md`, `editorial-templates.md` et `editorial-decisions.md` organisent la suite. Les tests de contenu ne créent pas de promesse commerciale.', '', '## Compilation', '', '`python -m pip install -r scripts/editorial/requirements.txt`', '`python scripts/editorial/build.py`', '`python tests/editorial_contract.py`', '', 'Les pages générées restent des HTML lisibles sans JavaScript. Les sources éditoriales sont dans `content/editorial/`. Les chemins historiques sont conservés. Le site continue d’utiliser son backend et son mode de publication existants.', '']
 write('content/editorial-delivery.md','\n'.join(lines))
 print(json.dumps({k:manifest[k] for k in ['new_articles','rewritten_articles','authored_articles','authored_words','faq_questions','index_entries']},ensure_ascii=False))

def main():
 articles=load_articles()
 for a in articles:generate_article(a)
 total=guides(articles);journeys();faq();integrate_navigation();count=refresh_index(articles);sitemap(articles);register(articles,total,count)
 if not (ROOT/'assets/editorial-members.css').exists():raise RuntimeError('Editorial style missing')
if __name__=='__main__':main()
