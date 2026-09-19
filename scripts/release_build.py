#!/usr/bin/env python3
"""Idempotent release assembler. Public files only, no credentials or remote writes."""
from pathlib import Path
from html import escape
from html.parser import HTMLParser
from datetime import datetime, timezone
import json, re, shutil
ROOT=Path(__file__).resolve().parents[1]
STAMP='2026-09-19'
def write(path,content):
 p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content,encoding='utf-8')
def read(path):return (ROOT/path).read_text(encoding='utf-8')

def shell(title,description,mode,module,content='',robots='noindex,follow'):
 return f'''<!doctype html><html lang="fr" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#F7F7F4"><meta name="robots" content="{robots}"><title>{escape(title)} — Squared Help Center</title><meta name="description" content="{escape(description,quote=True)}"><link rel="icon" href="assets/logo-squared.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="assets/docs.css"><link rel="stylesheet" href="assets/sidebar.css"><link rel="stylesheet" href="assets/forum.css"><link rel="stylesheet" href="assets/operations.css"></head><body data-forum-page="utility" data-ops-page="{mode}"><a class="ops-skip" href="#opsRoot">Aller au contenu</a><div id="progress" class="progress"></div><div class="app"><aside class="sidebar hc-sidebar" id="sidebar"></aside><main class="main"><header class="topbar"><button class="icon-btn mobile-menu" id="menuBtn" aria-label="Ouvrir la navigation"></button><div class="crumbs"><a href="index.html">Help Center</a><span>›</span><strong>{escape(title)}</strong></div><div class="top-actions"><button class="btn command-search hide-mobile" data-search-open><span>Rechercher</span><span class="keyboard-hint">⌘K</span></button><span id="forumAccount"></span><button class="icon-btn" id="quickActionsBtn" aria-label="Actions rapides"></button><button class="icon-btn" id="themeBtn" aria-label="Changer de thème"></button></div></header><div class="ops-shell"><header><p class="eyebrow">Squared Group · Help Center</p><h1>{escape(title)}</h1><p>{escape(description)}</p></header><div id="opsRoot" tabindex="-1">{content or '<p role="status">Chargement…</p>'}</div><footer class="footer"><span>Squared Group · Centre d’aide</span><span class="footer-links"><a href="search.html">Recherche</a><a href="status.html">Services</a><a href="support.html">Support privé</a></span></footer></div></main></div><div class="search-modal" id="searchModal" role="dialog" aria-modal="true" aria-label="Recherche globale"><div class="search-box"><div class="search-head"><input id="searchInput" type="search" aria-label="Votre recherche" placeholder="Rechercher une réponse…"><button class="search-close" id="searchClose" aria-label="Fermer la recherche">Esc</button></div><div id="searchResults" class="search-results"></div><a class="btn" href="search.html">Ouvrir la recherche complète</a></div></div><div class="toast" id="toast" role="status"></div><script src="assets/sidebar.js"></script><script src="assets/docs.js"></script><script type="module" src="assets/forum.js"></script>{f'<script type="module" src="assets/{module}"></script>' if module else ''}</body></html>'''

PAGES={
 'admin.html':('Administration','Documentation, support, incidents, qualité et journal des opérations.','admin','operations-admin.js'),
 'search.html':('Recherche','Articles, discussions, incidents, composants et vos demandes privées — sans quitter le centre d’aide.','search','knowledge-app.js'),
 'article.html':('Article','Documentation publiée et révisée par l’équipe Squared.','article','knowledge-app.js'),
 'status.html':('État des services','Mesures persistantes, fraîcheur des observations et communications d’incident.','status','operations-status.js'),
 'server-status.html':('États des serveurs','Squared Group, ses modules, Squared Workspace et le Help Center : des états fondés sur les mesures disponibles.','servers','operations-status.js'),
 'incidents.html':('Historique des incidents','Les communications publiées, leur progression et leur résolution.','incidents','operations-status.js'),
 'incident.html':('Détail d’un incident','Composants concernés et chronologie des mises à jour.','incident','operations-status.js'),
 'scheduled-maintenance.html':('Maintenances programmées','Interventions annoncées et historique des maintenances.','maintenance','operations-status.js'),
 'account-settings.html':('Paramètres du compte','Identité, interface, notifications, sessions et données personnelles.','account','operations-account.js'),
 'notification-settings.html':('Préférences de notifications','Choisissez les communications reçues dans le centre d’aide.','account','operations-account.js'),
 'my-tickets.html':('Mes demandes','Retrouvez et suivez vos conversations privées avec le support.','tickets','operations-account.js')}
for path,(title,desc,mode,module) in PAGES.items():write(path,shell(title,desc,mode,module))

# Safely repair the previous single-node/list confusion without modifying valid $$ calls.
for path in (ROOT/'assets').glob('*.js'):
 if path.name.endswith('.bundle.js') or path.name in ['hc-state.js']:continue
 text=path.read_text(encoding='utf-8')
 text=re.sub(r'\${3,}\(',lambda m:'$$(',text)
 text=re.sub(r'(?<!\$)\$\(([^()\n]*?)\)\.forEach',lambda m:'$$('+m.group(1)+').forEach',text)
 text=re.sub(r'from ["\']https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js@[^"\']+["\']',"from './vendor/supabase.js'",text)
 # Share one auth/session client across enhanced pages.
 text=re.sub(r'^const (supabase|client|db)\s*=\s*createClient\((SUPABASE_URL\s*,\s*SUPABASE_PUBLISHABLE_KEY)\);',lambda m:'const '+m.group(1)+'=globalThis.__SQHelpClient||(globalThis.__SQHelpClient=createClient('+m.group(2)+'));',text,flags=re.M)
 path.write_text(text,encoding='utf-8')

# Never interpolate forum/user text as markup in the classic command palette.
docs=read('assets/docs.js')
start=docs.find('function renderSearchRows(list){');end=docs.find('\nasync function render(',start)
if start!=-1 and end!=-1:
 replacement='''function renderSearchRows(list){
 if(!results)return;
 const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safe=list.map(x=>{try{const u=new URL(hrefFor(x.href),location.href);if(u.origin!==location.origin||!['http:','https:'].includes(u.protocol))return null;return {...x,url:u.href};}catch{return null;}}).filter(Boolean);
 results.innerHTML=safe.length?safe.slice(0,24).map(x=>'<a class="search-result" data-search-kind="'+e(x.kind||'knowledge')+'" data-search-href="'+e(x.href)+'" href="'+e(x.url)+'"><span class="result-ico">'+(window.SQIconly?SQIconly.icon(x.kind==='forum'?'forum':x.kind==='ticket'?'support':'documents','outline','md'):'')+'</span><span><strong>'+e(x.title)+'</strong><p>'+e(x.description||'')+'</p></span><em>'+e(x.category||'Résultat')+'</em></a>').join(''):'<div class="search-empty">Aucun résultat. Essayez une autre formulation.</div>';
}'''
 docs=docs[:start]+replacement+docs[end:]
# Never infer a reviewed date merely because a page loaded.
docs=docs.replace("'<span>·</span><span>Mis à jour le 18 sept. 2026</span>'","'<span>·</span><span>Guide de référence</span>'")
if 'ops-a11y-20260919' not in docs:
 docs+='''\n/* ops-a11y-20260919 */
(()=>{let trigger=null;document.addEventListener('click',e=>{const t=e.target.closest('[data-search-open],#searchTrigger');if(t)trigger=t;},true);const m=document.getElementById('searchModal');m?.addEventListener('keydown',e=>{if(e.key==='Escape'){m.classList.remove('open');trigger?.focus();return;}if(e.key!=='Tab')return;const f=[...m.querySelectorAll('a[href],button,input,[tabindex="0"]')].filter(x=>!x.disabled&&x.getClientRects().length);if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}});document.querySelectorAll('[role="button"][data-search-open]').forEach(b=>b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();b.click();}}));try{if(localStorage.getItem('sq-help-reduced-motion')==='1')document.body.classList.add('reduce-motion');}catch{}})();
'''
write('assets/docs.js',docs)

side=read('assets/sidebar.js').replace("localHref('assets/react-ui.js')","localHref('assets/react-ui.bundle.js')")
if 'ops-single-accordion-20260919' not in side:
 side+='''\n/* ops-single-accordion-20260919 */
(()=>{const host=document.getElementById('sidebar');if(!host)return;const sync=()=>host.querySelectorAll('.hc-item.has-children').forEach((item,i)=>{const button=item.querySelector('.hc-sub-toggle'),panel=item.querySelector('.hc-sub-links');if(button&&panel){panel.id=panel.id||'sq-subpages-'+i;button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded',String(item.classList.contains('child-open')));}});sync();host.addEventListener('click',e=>{const button=e.target.closest('.hc-sub-toggle');if(!button)return;e.preventDefault();e.stopImmediatePropagation();const item=button.closest('.hc-item'),opened=item.classList.contains('child-open');host.querySelectorAll('.hc-item.child-open').forEach(x=>x.classList.remove('child-open'));if(!opened)item.classList.add('child-open');try{localStorage.setItem('sq-help-open-child',opened?'':item.dataset.itemHref||'');}catch{}sync();},true);})();
'''
write('assets/sidebar.js',side)
forum=read('assets/forum.js')
# Never send an entire private support description to usage analytics/search suggestions.
forum=forum.replace('($("#ticketSubject")?.value+" "+$("#ticketDescription")?.value).trim()','String($("#ticketSubject")?.value||"").trim().slice(0,150)')
# Realtime updates must not reload a page and discard a message being written.
forum=forum.replace('()=>location.reload()).subscribe()',"()=>{const writing=[...document.querySelectorAll('textarea')].some(x=>x.value.trim());if(!writing)location.reload();else window.dispatchEvent(new CustomEvent('sq:new-content'));}).subscribe()")
write('assets/forum.js',forum)
react=read('assets/react-ui.js')
react=re.sub(r'from ["\']https://esm\.sh/react@[^"\']+["\']','from "react"',react)
react=re.sub(r'from ["\']https://esm\.sh/react-dom@[^"\']+/client["\']','from "react-dom/client"',react)
react=react.replace('hover:tw-','tw:hover:').replace('xl:tw-','tw:xl:').replace('tw-','tw:')
write('assets/react-ui.js',react)
write('src/tailwind.css','''@layer theme, utilities;
@import "tailwindcss/theme.css" layer(theme) prefix(tw);
@import "tailwindcss/utilities.css" layer(utilities) prefix(tw);
@source "../assets/react-ui.js";
@theme { --font-sans: "Space Grotesk", ui-sans-serif, system-ui, sans-serif; --color-squared: #7BE84E; }
@utility sq-glass { background: color-mix(in srgb,var(--bg-2) 92%,transparent); border:1px solid var(--line); backdrop-filter:blur(16px); }
''')

# Stable public guide content. No invented native-app menu names or release claims.
GUIDES=[
('workspace-access-checklist','Activer son accès Workspace sans créer de doublon','Vérifier une invitation, le bon compte et le périmètre autorisé.',[
('Avant de commencer','Utilisez l’adresse qui a reçu l’invitation. Conservez le message original et vérifiez le domaine avant d’ouvrir le lien. L’espace de travail et le compte du Help Center sont deux accès distincts : créer un compte sur le forum ne crée pas automatiquement un espace Workspace.'),
('Vérifier l’invitation','Ouvrez le dernier message reçu. Une ancienne invitation peut avoir expiré ou avoir été remplacée. Ne recopiez pas son jeton dans un sujet public. En cas de lien expiré, demandez une nouvelle invitation au responsable qui vous l’a envoyée.'),
('Éviter les doublons','Avant de créer un autre compte, vérifiez l’adresse utilisée, l’organisation et le rôle attendu. Un client et un collaborateur ne voient pas forcément les mêmes modules. Un écran manquant peut être une restriction normale plutôt qu’un compte absent.'),
('Contrôler après activation','Vérifiez le nom de l’espace, le projet attendu et vos permissions. Ne demandez pas des droits administrateur pour contourner un problème d’affichage. Demandez uniquement les autorisations nécessaires à votre mission.'),
('Obtenir de l’aide','Dans le support privé, indiquez votre appareil, l’adresse concernée, la date du message, le résultat attendu et le texte exact de l’erreur. Masquez le lien complet d’activation et n’envoyez jamais votre mot de passe. Les libellés peuvent varier selon la version de Workspace.')]),
('workspace-installation-checklist','Installer et mettre à jour Workspace','Une vérification par plateforme, sans installer un fichier d’origine inconnue.',[
('Source de l’installation','Utilisez uniquement le lien d’installation ou d’invitation transmis par Squared Group. Les canaux iOS, iPadOS, macOS et web peuvent être à des stades de disponibilité différents. Une page de présentation ne garantit pas qu’une version native est distribuée publiquement.'),
('Version de test','Pour une bêta distribuée via TestFlight, utilisez l’invitation dédiée et le même compte attendu. Vérifiez l’état de disponibilité de la version avant de conclure à un problème de compte. Ne partagez pas une invitation privée sur le forum.'),
('Avant une mise à jour','Sauvegardez le travail non envoyé, notez la version installée et fermez les opérations en cours. Une mise à jour du client ne résout pas forcément un problème de permission ou de backend.'),
('Contrôle après installation','Connectez-vous à votre espace, ouvrez un projet autorisé et vérifiez les informations attendues. Comparez le comportement à celui de la version précédente uniquement avec le même rôle et le même environnement.'),
('Rapport reproductible','Fournissez plateforme, version système, version de l’app, étape qui bloque et message exact. N’installez pas de profil de configuration inconnu et ne contournez pas un avertissement de certificat pour accéder au service.')]),
('workspace-client-review','Valider un livrable côté client','Relire la bonne version et transmettre un retour exploitable.',[
('Identifier le bon livrable','Vérifiez le projet, le titre, la version et la date de remise. Un document de travail n’est pas nécessairement une version à valider. En cas de doute, demandez quelle version fait foi.'),
('Faire une relecture complète','Comparez le livrable au brief validé. Distinguez une correction, une question et une nouvelle demande de périmètre. Regroupez les retours par écran, page ou élément pour éviter des messages contradictoires.'),
('Rédiger un retour utile','Décrivez l’élément, le comportement observé, le résultat attendu et le contexte. Pour une capture, masquez les données personnelles. Pour du texte, citez la phrase et la formulation souhaitée.'),
('Confirmer la validation','La validation doit viser une version précise. Ne considérez pas une absence de réponse comme une approbation. La modalité de validation applicable dépend du projet et de l’espace client.'),
('Conserver la trace','Rassemblez les décisions dans l’échange du projet. Ne multipliez pas les fichiers nommés final-final2. Le responsable doit pouvoir retrouver la version remise, les retours et la décision finale.')]),
('workspace-sync-diagnostic','Diagnostiquer une donnée manquante dans Workspace','Séparer compte, permissions, filtre et synchronisation avant toute correction.',[
('Définir le symptôme','Notez ce qui manque et où : liste, détail, document ou notification. Indiquez si la donnée était visible auparavant et le moment du dernier fonctionnement connu.'),
('Vérifier le contexte','Contrôlez le compte, l’organisation, le rôle et le projet. Réinitialisez les filtres de recherche lorsque cela est possible. Comparez des vues équivalentes, pas un espace client à un espace d’administration.'),
('Éviter une recréation inutile','Une donnée filtrée ou inaccessible peut toujours exister. Ne recréez pas un projet, une mission ou un document pour compenser un affichage vide sans vérifier la source. Cela peut créer des doublons et casser la traçabilité.'),
('Observer le réseau','Consultez l’état des services. Une mesure HTTP positive ne prouve pas qu’une opération métier fonctionne. Notez si le problème apparaît sur un seul réseau ou plusieurs, sans désactiver les protections de sécurité.'),
('Transmettre au support','Indiquez l’objet concerné, l’heure, la plateforme, la version, les étapes et l’impact. Ne fournissez pas de jeton de session ni d’export complet de données clients. Une capture masquée et un identifiant non sensible suffisent souvent.')]),
('help-center-private-support','Comprendre le traitement de votre demande privée','Statuts, pièces jointes et échanges avec l’équipe Squared.',[
('Choisir le bon canal','Une question générale réutilisable appartient au forum. Un problème de compte, de facturation ou lié à un client doit passer par le support privé. Un ticket privé n’autorise pas l’envoi de secrets.'),
('Décrire le problème','Commencez par le résultat attendu, puis le résultat observé. Ajoutez le produit, la plateforme, la version et l’heure. Les articles suggérés peuvent résoudre le problème sans ouvrir une nouvelle demande.'),
('Pièces jointes','Utilisez des captures expurgées ou un fichier de diagnostic limité au besoin. Le centre d’aide limite la taille d’un fichier à 10 Mo. Ne joignez ni mot de passe, ni clé API, ni invitation complète.'),
('Suivre les états','Ouvert signifie que la demande a été enregistrée. En cours indique une prise en charge. En attente de vous demande une réponse ou une précision. Résolu et fermé correspondent à la fin du traitement. Les délais cibles visibles dans l’administration sont des objectifs internes, pas une promesse contractuelle.'),
('Protéger le contexte','Les notes internes de l’équipe ne sont pas publiées dans votre conversation. Votre export personnel n’inclut pas ces notes. La disponibilité d’une réponse sur le site ne signifie pas qu’un e-mail a été envoyé.')]),
('help-center-status-method','Lire correctement l’état des services','Mesures, incidents et disponibilité produit ne sont pas la même chose.',[
('Mesures automatiques','Une sonde serveur tente un contrôle périodique. Le statut correspond à cette observation datée. Une mesure de plus de quinze minutes doit être affichée comme ancienne et non comme une confirmation actuelle.'),
('Contrôles HTTP','Un contrôle HTTP vérifie qu’une ressource répond. Il ne valide pas automatiquement un formulaire de contact, un paiement, une permission ou une opération d’écriture. Une page peut répondre alors qu’un parcours métier est dégradé.'),
('Incidents déclarés','Une communication d’incident décrit un problème confirmé et son traitement. L’absence d’incident déclaré ne signifie pas que toutes les fonctions ont été testées. Les mesures et les communications sont présentées séparément.'),
('Interpréter les statistiques','Un pourcentage de contrôles réussis décrit les échantillons disponibles. Il n’est pas une garantie de disponibilité continue sur trente jours, surtout si l’observation a commencé récemment. Aucune statistique n’est affichée comme 100 % sans données.'),
('Produits en développement','Les versions natives en développement ou en bêta peuvent nécessiter un contrôle fonctionnel manuel. Elles sont distinguées des services de production pour éviter de présenter une absence de distribution comme une panne.')])]
for slug,title,desc,sections in GUIDES:
 content='<article class="ops-article"><p class="ops-note">Guide de procédure. Les permissions et libellés propres à l’app dépendent de la version et de votre espace. Ne contournez pas les droits pour appliquer ce guide.</p>'+''.join('<section><h2>'+escape(t)+'</h2><p>'+escape(b)+'</p></section>' for t,b in sections)+'<div class="ops-inline"><a class="btn" href="support.html">Support privé</a><a class="btn" href="search.html">Rechercher un autre guide</a></div></article>'
 write(slug+'.html',shell(title,desc,'guide',None,content,'index,follow'))

# HTML catalogue generated from readable article content, never scripts or account data.
class Extract(HTMLParser):
 def __init__(self):super().__init__();self.skip=0;self.parts=[];self.title=[];self.in_title=False;self.description='';self.skipstack=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);bad=tag in ['script','style','nav','aside','form','footer'] or (tag=='header' and 'topbar' in a.get('class',''))
  if tag not in ['meta','link','img','input','br','hr','source','wbr']:self.skipstack.append((tag,bad));self.skip+=int(bad)
  if tag=='title':self.in_title=True
  if tag=='meta' and a.get('name')=='description':self.description=a.get('content','')
 def handle_endtag(self,tag):
  if tag=='title':self.in_title=False
  for i in range(len(self.skipstack)-1,-1,-1):
   if self.skipstack[i][0]==tag:
    self.skip-=sum(int(b) for _,b in self.skipstack[i:]);self.skipstack=self.skipstack[:i];break
 def handle_data(self,data):
  if self.in_title:self.title.append(data)
  elif not self.skip and data.strip():self.parts.append(data.strip())
private={'admin.html','moderation.html','login.html','forgot-password.html','reset-password.html','profile.html','account-settings.html','notification-settings.html','notifications.html','bookmarks.html','my-tickets.html','my-activity.html','support-ticket.html','forum-new.html','article.html','incident.html','forum-topic.html','404.html','community.html'}
items=[]
for path in sorted(ROOT.rglob('*.html')):
 rel=path.relative_to(ROOT).as_posix()
 if any(x in path.parts for x in ['node_modules','.git','_site','test-results','playwright-report']) or rel in private:continue
 parser=Extract();parser.feed(path.read_text(encoding='utf-8'));title=' '.join(parser.title).split(' — Squared')[0].strip();text=' '.join(parser.parts)
 if not title:continue
 product='Squared Workspace' if 'workspace' in rel else 'Wix Studio' if 'wix' in rel else 'Design System' if 'design-system' in rel else 'Squared Help Center'
 items.append({'title':title,'description':parser.description,'href':rel,'category':product,'text':text[:80000],'source_kind':'static'})
write('assets/knowledge-index.json',json.dumps({'generated_on':STAMP,'documents':items},ensure_ascii=False,separators=(',',':')))

# Avoid stale green labels on the homepage; use the persistent read model.
index=read('index.html')
index=index.replace('<em>Suivi actif</em>','<em>Consulter les mesures</em>')
if 'operations-home.js' not in index:index=index.replace('</body>','<script type="module" src="assets/operations-home.js"></script></body>')
write('index.html',index)
# Fix generated legacy line break in XML and extend the public sitemap.
sitemap=read('sitemap.xml').replace('\\n','\n')
for slug,*_ in GUIDES:
 url='https://docs.squaredgroup.studio/'+slug+'.html'
 if url not in sitemap:sitemap=sitemap.replace('</urlset>','<url><loc>'+url+'</loc></url>\n</urlset>')
write('sitemap.xml',sitemap)

# CI resolves versions once, commits its lockfile and generated static assets.
pkg=json.loads(read('package.json'));pkg.update({'name':'squared-help-center','version':'7.1.0','private':True,'type':'module'})
pkg['scripts']={'build:assets':'node scripts/bundle.mjs','build:tailwind':'tailwindcss -i src/tailwind.css -o assets/tailwind.generated.css --minify','test':'node --test tests/state.test.mjs','test:browser':'playwright test','check':'node scripts/check.mjs'}
pkg.setdefault('dependencies',{}).update({'@supabase/supabase-js':'^2','react':'^19','react-dom':'^19'})
pkg.setdefault('devDependencies',{}).update({'esbuild':'^0.25','@tailwindcss/cli':'^4','tailwindcss':'^4','@playwright/test':'^1.56'})
write('package.json',json.dumps(pkg,indent=2)+'\n')
write('RELEASE-7.1.md','''# Squared Help Center — opérations 7.1

Date : 19 septembre 2026.

## Livré
- Recherche sur texte complet local + recherche RLS en ligne.
- Console d’administration avec erreurs visibles et opérations d’incident atomiques.
- Éditeur de nouveaux articles, révisions et relecture, sans prétendre protéger une page HTML par son index.
- Statuts persistants tenant compte de la fraîcheur, des versions en développement et de la fenêtre observée.
- Préférences appliquées, export personnel, statistiques facultatives sans contenu de ticket.
- Protection des notes internes/pièces jointes, champs réservés et récompenses de solution idempotentes.
- Dépendances exécutées depuis le site, compilation Tailwind avec préfixe v4 correct.

## Vérification
La CI exécute des tests unitaires et des parcours navigateur avec réponses réseau simulées, sans créer de faux utilisateurs en production. Les tests SQL authentifiés de bout en bout en production n’ont pas été exécutés. Les états des services réels restent ceux des sondes existantes.

## Limites assumées
- Les e-mails de support/incidents nécessitent un fournisseur d’envoi configuré. Aucun envoi n’est inventé.
- L’authentification réelle dépend des réglages de redirection et d’envoi déjà configurés sur Supabase.
- Le statut natif Workspace ne remplace pas des tests d’installation par plateforme.
- Une page HTML du dépôt reste publique même si son entrée éditoriale est retirée du catalogue.
- La traduction anglaise et un assistant IA documentaire ne sont pas activés.
''')
print(json.dumps({'generated_pages':len(PAGES)+len(GUIDES),'indexed_documents':len(items),'release':'7.1.0'}))
