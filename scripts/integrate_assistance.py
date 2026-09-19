"""Idempotent integration of task-oriented help. No production data mutations.
Keep the responsive contract last. Only versioned HTML and public search index are generated.
"""
import json,re,html,os,runpy
from pathlib import Path
from html.parser import HTMLParser
from xml.etree import ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
STAMP='20260919.2'
def read(p):return (ROOT/p).read_text()
def write(p,s):
    f=ROOT/p;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(s)
def replace(s,old,new,name):
    if old not in s:
        if new in s:return s
        raise ValueError('Integration marker missing: '+name)
    return s.replace(old,new,1)
runpy.run_path(str(ROOT/'scripts/help_guide_content.py'))

# Home: users first, products next. No stored audience role or inferred permissions.
home=read('index.html')
if 'sq-task-grid' not in home:
    task='''<section class="section" aria-labelledby="taskTitle"><div class="section-head"><div><h2 id="taskTitle">Que souhaitez-vous faire ?</h2><p>Choisissez votre besoin. Aucun changement de compte ou de permissions.</p></div><a class="btn" href="diagnostic.html">Me guider</a></div><div class="sq-task-grid">
<a class="sq-task-card" href="parcours.html?profil=client"><span class="sq-task-icon" data-icon-key="account"></span><strong>Utiliser mon espace client</strong><p>Activer mon accès, retrouver un document ou un livrable.</p><small>Parcours client →</small></a>
<a class="sq-task-card" href="parcours.html?profil=applications"><span class="sq-task-icon" data-icon-key="workspace"></span><strong>Utiliser une application Squared</strong><p>Installer, me connecter et résoudre un problème.</p><small>Parcours applications →</small></a>
<a class="sq-task-card" href="parcours.html?profil=equipe"><span class="sq-task-icon" data-icon-key="projects"></span><strong>Travailler avec Squared</strong><p>Retrouver mes méthodes et les outils de mes missions.</p><small>Parcours collaborateur →</small></a>
</div></section><section id="helpResume" class="sq-journey-panel" hidden aria-live="polite"></section><section id="readingResume" class="sq-journey-panel" hidden></section>'''
    home=home.replace('<section class="section" id="knowledge">',task+'\n<section class="section" id="knowledge">',1)
    home=home.replace('<h3>Documentation</h3>','<h3>Trouver un guide</h3>').replace('<h3>Communauté</h3>','<h3>Poser une question</h3>').replace('<h3>Support privé</h3>','<h3>Suivre ma demande</h3>')
write('index.html',home)
if 'id="readingResume"' not in read('index.html'):write('index.html',read('index.html').replace('<section id="helpResume"', '<section id="readingResume" class="sq-journey-panel" hidden></section><section id="helpResume"'))

# Guest support needs one clear recovery route; no empty private dashboard placeholders.
s=read('support.html')
if 'data-auth-area' not in s:
    s=re.sub(r'<div id="supportGuest".*?</div>',lambda m:'''<div id="supportGuest" class="forum-auth-card" hidden><h2>Besoin d’une aide privée ?</h2><p>Connectez-vous pour créer une demande et retrouver vos échanges avec Squared.</p><div class="hero-actions"><a class="btn green" id="supportLogin" href="login.html?next=support.html">Se connecter</a><a class="btn" href="access-help.html">Je n’arrive pas à me connecter</a></div></div><p id="supportChecking" role="status">Vérification de votre session…</p>''',s,count=1,flags=re.S)
    s=s.replace('<div class="support-summary-grid">','<div class="support-summary-grid" data-auth-area hidden>',1).replace('<div class="v6-support-layout">','<div class="v6-support-layout" data-auth-area hidden>',1).replace('<form class="form-card" id="ticketForm">','<form class="form-card" id="ticketForm" hidden>',1).replace('<aside class="v6-support-compose">','<aside class="v6-support-compose" id="nouvelle-demande">',1)
write('support.html',s)

# Backend supports cancellation without logging private free-text searches.
s=read('assets/search-backend.js')
s=s.replace('async function search(query,limit=30){','async function search(query,limit=30,signal){')
s=s.replace('const {data,error}=await client.rpc("search_help_center",{p_query:q,p_limit:limit});','let request=client.rpc("search_help_center",{p_query:q,p_limit:limit});\n  if(signal)request=request.abortSignal(signal);\n  const {data,error}=await request;')
s=s.replace('query:payload.query||null,','query:session?null:(payload.query||null),')
s=s.replace('id,role,display_name,username"','id,role,display_name,username,is_banned"')
write('assets/search-backend.js',s)

# One safe search/theme owner rather than overlapping event handlers.
s=read('assets/docs.js')
if 'SQHelp.setupAppearance' not in s:
    start=s.index("const saved=getStore('sq-docs-theme')")
    end=s.index("$('#menuBtn')",start)
    s=s[:start]+"window.SQHelp.applyTheme();\nwindow.SQHelp.setupAppearance($('#themeBtn'));\n"+s[end:]
    start=s.index('function renderSearchRows(')
    end=s.index("$$('[data-copy]')",start)
    s=s[:start]+'''let searchController=null,inputTimer=null;
function renderSearchRows(list,partial=false){if(results)SQHelp.paint(results,list,input?.value||'',{modal:true,partial});}
async function render(q=''){
  if(!results)return;const id=++searchRequestId;searchController?.abort();searchController=new AbortController();const control=searchController;
  results.textContent='Recherche dans les guides et la communauté…';results.setAttribute('aria-busy','true');
  const timeout=setTimeout(()=>control.abort(),7000);
  try{const data=await SQHelp.lookup(q,{signal:control.signal,limit:50});if(id!==searchRequestId)return;renderSearchRows(data.rows.filter(remoteFilter),data.partial);}
  catch{if(id!==searchRequestId)return;const data=await SQHelp.lookup(q,{remote:false});if(id!==searchRequestId)return;renderSearchRows(data.rows.filter(remoteFilter),true);}
  finally{clearTimeout(timeout);}
}
function openSearch(){if(!modal)return;modal.classList.add('open');if(input){input.value='';setTimeout(()=>input.focus(),20)}render('');}
function closeSearch(){++searchRequestId;searchController?.abort();clearTimeout(inputTimer);results?.replaceChildren();modal?.classList.remove('open');}
$$('[data-search-open],#searchTrigger').forEach(b=>b.addEventListener('click',openSearch));
$('#searchClose')?.addEventListener('click',closeSearch);modal?.addEventListener('click',e=>{if(e.target===modal)closeSearch();});
input?.addEventListener('input',()=>{++searchRequestId;searchController?.abort();clearTimeout(inputTimer);inputTimer=setTimeout(()=>render(input.value),160);});
input?.addEventListener('keydown',e=>SQHelp.keyboard(input,results,e));results?.addEventListener('keydown',e=>SQHelp.keyboard(input,results,e));
$$('.filter-chip').forEach(b=>b.addEventListener('click',()=>{$$('.filter-chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.filter;render(input?.value||'');}));
addEventListener('keydown',e=>{const el=document.activeElement;if(el?.isContentEditable)return;if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}else if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(el?.tagName)){e.preventDefault();openSearch();}else if(e.key==='Escape')closeSearch();});
SQHelp.backend().then(b=>b?.client.auth.onAuthStateChange(event=>{if(['SIGNED_OUT','SIGNED_IN','USER_UPDATED'].includes(event))closeSearch();}));
''' + s[end:]
    s=s.replace("'<span>·</span><span>Mis à jour le 18 sept. 2026</span>'", "'<span>·</span><span>Consultez la date de révision du guide</span>'")
write('assets/docs.js',s)

# Private support state and transitions remain controlled by the session and RLS.
s=read('assets/forum.js')
if 'supportVisibility' not in s:
    s=s.replace('let session=null, me=null;','''let session=null, me=null,authRevision=0,authBound=false;
function supportVisibility(mode){
  document.querySelectorAll('[data-auth-area]').forEach(e=>e.hidden=mode!=='member');
  if($('#supportGuest'))$('#supportGuest').hidden=mode!=='guest';
  if($('#supportChecking')){$('#supportChecking').hidden=mode!=='loading'&&mode!=='error';$('#supportChecking').textContent=mode==='error'?'La session ne peut pas être vérifiée. Rechargez la page ou utilisez l’aide de connexion.':'Vérification de votre session…';}
  if($('#ticketForm'))$('#ticketForm').hidden=mode!=='member';
}
function clearPrivateView(){
  ++authRevision;session=null;me=null;
  ['ticketList','supportTicketMount','notificationsList','profileMount','profileActivity','helpResume'].forEach(id=>{const el=$('#'+id);if(el)el.replaceChildren();});
  $('#ticketForm')?.reset();supportVisibility('guest');
}
''')
    s=s.replace('const {data:{session:s}}=await supabase.auth.getSession();\n  session=s;', '''const auth=await supabase.auth.getSession();if(auth.error)throw auth.error;
  const s=auth.data.session;session=s;
  if(!authBound){authBound=true;supabase.auth.onAuthStateChange((event,next)=>{
    if(event==='SIGNED_OUT'){clearPrivateView();renderAccount();}
    else if(event==='SIGNED_IN'&&session&&next?.user.id!==session.user.id){clearPrivateView();location.reload();}
  });}''')
    s=s.replace('const n=await unreadCount();\n  host.innerHTML=', 'const accountUser=session.user.id;const n=await unreadCount();if(session?.user.id!==accountUser)return;\n  host.innerHTML=')
    old='function safeNext(){const n=new URLSearchParams(location.search).get("next");return n&&/^[a-z0-9_\\-./?=#%]+$/i.test(n)&&!n.startsWith("//")?n:"forum.html"}'
    s=replace(s,old,'''function safeNext(){const n=new URLSearchParams(location.search).get('next');return n?window.SQHelp.safe(n):window.SQHelp.local('forum.html');}''','safeNext')
    old='''if(!session){$("#supportGuest").hidden=false;form.hidden=true;list.innerHTML='<div class="forum-empty"><strong>Connectez-vous pour suivre vos demandes</strong>Vos tickets restent privés entre vous et le support.</div>';return}
  $("#supportGuest").hidden=true;form.hidden=false;'''
    new='''supportVisibility(session?'member':'guest');
  const login=$('#supportLogin');if(login)login.href=loginUrl();
  if(!session){list.replaceChildren();return;}
  const expectedUser=session.user.id,expectedAuth=authRevision;'''
    s=replace(s,old,new,'support state')
    pos=s.index('async function initSupport(){');end=s.index('async function initSupportTicket()',pos)
    part=s[pos:end]
    marker='.order("last_activity_at",{ascending:false});\n  if(!error)'
    part=replace(part,marker,'.order("last_activity_at",{ascending:false});\n  if(authRevision!==expectedAuth||session?.user.id!==expectedUser)return;\n  if(!error)','support race guard')
    st=part.index('  let suggestionTimer=null;')
    part=part[:st]+'''  if(form.dataset.supportBound)return;form.dataset.supportBound='1';
  let suggestionTimer=null,suggestionVersion=0;
  const suggest=()=>{const version=++suggestionVersion;clearTimeout(suggestionTimer);
    suggestionTimer=setTimeout(async()=>{
      const q=($('#ticketSubject')?.value||'').trim(),box=$('#supportSuggestions');if(!box||q.length<3){if(box)box.hidden=true;return;}
      // Suggestions use only the local public index. No private body leaves the form.
      const data=await SQHelp.lookup(q,{remote:false,limit:3});if(version!==suggestionVersion||!session)return;
      box.replaceChildren();box.hidden=!data.rows.length;if(box.hidden)return;
      const title=document.createElement('strong');title.textContent='Ces guides peuvent vous aider';box.append(title);
      data.rows.forEach(r=>{const a=document.createElement('a');a.href=SQHelp.safe(r.href);a.target='_blank';a.rel='noreferrer';a.textContent=r.title;box.append(a);});
    },250);
  };
  $('#ticketSubject')?.addEventListener('input',suggest);
  let busy=false,created=null;
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;clearAlert('ticketAlert');
    if(!session){supportVisibility('guest');return;}
    const submit=form.querySelector('[type="submit"]');busy=true;submit.disabled=true;form.setAttribute('aria-busy','true');
    try{
      if(!created){const payload={requester_id:session.user.id,subject:$('#ticketSubject').value.trim(),description:$('#ticketDescription').value.trim(),category:$('#ticketCategory').value,product:$('#ticketProduct')?.value||'Help Center'};
        const result=await supabase.from('support_tickets').insert(payload).select('id,ticket_number').single();if(result.error)throw result.error;created=result.data;
      }
      try{await uploadSupportFiles(created.id,null,$('#ticketFiles')?.files);location.href='support-ticket.html?id='+created.id;}
      catch(error){alertBox('ticketAlert','Demande créée, mais pièce jointe non envoyée. Ouvrez la demande pour vérifier les fichiers reçus avant de réessayer.');
        const a=document.createElement('a');a.className='btn';a.href='support-ticket.html?id='+created.id;a.textContent='Ouvrir ma demande';$('#ticketAlert').append(a);
        submit.hidden=true;
      }
    }catch(error){alertBox('ticketAlert',error.message||'Envoi impossible. Vérifiez votre historique avant une nouvelle tentative.');}
    finally{busy=false;submit.disabled=false;form.removeAttribute('aria-busy');}
  });
}

'''
    s=s[:pos]+part+s[end:]
    s=s.replace('init();', '''init().catch(error=>{supportVisibility('error');const host=$('#supportChecking')||$('#forumTopics')||$('#topicMount');if(host){host.textContent='Le service ne peut pas être chargé actuellement. ';const a=document.createElement('a');a.href='access-help.html';a.textContent='Aide de connexion';host.append(a);}});''')
    anchor='const box=$("#replyBox");'
    s=replace(s,anchor,'''if(canStaff){const a=document.createElement('a');a.className='mini-action';a.href='editorial.html?source='+encodeURIComponent(id);a.textContent='Préparer un article';host.querySelector('.topic-actions')?.append(a);}
    '''+anchor,'draft action')
write('assets/forum.js',s)

# Less noise in one shared sidebar; the exclusive child accordion is retained.
s=read('assets/sidebar.js')
if "href:'diagnostic.html'" not in s:
    s=s.replace("{href:'getting-started.html',icon:'start',label:'Bien démarrer'},", "{href:'parcours.html',icon:'start',label:'Votre parcours'},\n {href:'diagnostic.html',icon:'troubleshooting',label:'Dépannage guidé'},\n {href:'getting-started.html',icon:'start',label:'Bien démarrer'},")
    s=s.replace("{href:'asking-for-help.html',icon:'ask',label:'Demander de l’aide'},\n {href:'community-guidelines.html',icon:'guidelines',label:'Règles communauté'},\n {href:'support-privacy.html',icon:'privacy',label:'Confidentialité support'}", "{href:'asking-for-help.html',icon:'ask',label:'Aide & règles',children:[{href:'asking-for-help.html',label:'Demander de l’aide'},{href:'community-guidelines.html',label:'Règles communauté'},{href:'support-privacy.html',label:'Confidentialité support'},{href:'access-help.html',label:'Récupérer mon accès'}]}")
    s=s.replace("{href:'workspace/workspace-activation.html',label:","{href:'workspace/workspace-login.html',label:'Connexion'},\n   {href:'workspace/workspace-activation.html',label:")
write('assets/sidebar.js',s)

# Dedicated search uses exactly the same safe ranking and source labels as the palette.
write('assets/search-app.js', '''/* Shared universal search: cancellation, honest fallback, no query persistence. */
const H=window.SQHelp,$=s=>document.querySelector(s),input=$('#universalSearchInput'),host=$('#universalSearchResults');
let rows=[],active='all',version=0,timer,controller,partial=false;
function paint(){const list=active==='all'?rows:rows.filter(r=>r.kind===active);H.paint(host,list,input.value,{partial});$('#universalResultCount').textContent=list.length+' résultat'+(list.length>1?'s':'');}
async function run(q){const seq=++version;controller?.abort();controller=new AbortController();const c=controller,t=setTimeout(()=>c.abort(),7000);host.setAttribute('aria-busy','true');host.textContent='Recherche dans les guides et la communauté…';
 try{const data=await H.lookup(q,{signal:c.signal,limit:80});if(seq!==version)return;rows=data.rows;partial=data.partial;paint();}
 catch{if(seq!==version)return;const data=await H.lookup(q,{remote:false});if(seq!==version)return;rows=data.rows;partial=true;paint();}
 finally{clearTimeout(t);}
}
if(input&&host){input.maxLength=200;host.setAttribute('aria-live','polite');input.setAttribute('aria-label','Rechercher dans le centre d’aide');
 input.addEventListener('input',()=>{++version;controller?.abort();clearTimeout(timer);timer=setTimeout(()=>run(input.value),160);});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(timer);run(input.value);}else H.keyboard(input,host,e);});host.addEventListener('keydown',e=>H.keyboard(input,host,e));
 const labels={all:'Tout',knowledge:'Guides officiels',forum:'Communauté',ticket:'Mes demandes privées',incident:'Incidents',service:'Services',maintenance:'Maintenances'};
 const filters=[...document.querySelectorAll('[data-kind]')],parent=filters[0]?.parentElement;
 for(const [kind,label] of Object.entries(labels)){if(filters.some(b=>b.dataset.kind===kind))continue;if(!parent)continue;const b=document.createElement('button');b.className='forum-filter-tab';b.type='button';b.dataset.kind=kind;b.textContent=label;parent.append(b);filters.push(b);}
 filters.forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.kind===active));b.addEventListener('click',()=>{active=b.dataset.kind;filters.forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});paint();});});
 const history=$('#searchHistory');if(history)history.textContent='Vos termes de recherche ne sont pas conservés dans ce navigateur.';try{localStorage.removeItem('sq-help-search-history');}catch{}
 H.backend().then(b=>b?.client.auth.onAuthStateChange(event=>{if(['SIGNED_OUT','SIGNED_IN','USER_UPDATED'].includes(event)){++version;controller?.abort();clearTimeout(timer);rows=[];partial=false;host.replaceChildren();$('#universalResultCount').textContent='0 résultat';}}));
 const q=new URLSearchParams(location.search).get('q')||'';input.value=q;run(q);
}
''')

# Keep the specialized Wix guide functional; its chapter index is still usable.
wix=read('wix-studio.html')
if 'SQHelp.setupAppearance' not in wix:
    a=wix.index("const savedTheme=storeGet('sq-docs-theme')");b=wix.index("$('#menuBtn')",a)
    wix=wix[:a]+"window.SQHelp.applyTheme();window.SQHelp.setupAppearance($('#themeBtn'));\n"+wix[b:]
    wix=wix.replace("$('.hc-nav-link').forEach", "$$('.hc-nav-link').forEach")
    wix=wix.replace('https://github.com/squaredgroup/squared-docs/issues/new?template=documentation.yml','support.html')
write('wix-studio.html',wix)

# Common assets, final responsive ordering, labels and public index.
EXCLUDE={'.git','.github','node_modules','test-results','.reference'}
paths=[p for p in ROOT.rglob('*.html') if not EXCLUDE.intersection(p.relative_to(ROOT).parts)]
for f in paths:
    s=f.read_text()
    if 'assets/sidebar.css' not in s:continue
    prefix='../' if f.parent!=ROOT else ''
    if 'data-sq-assistance-style' not in s:
        marker='<link rel="stylesheet" href="'+prefix+'assets/responsive.css'
        idx=s.index(marker);s=s[:idx]+f'<link rel="stylesheet" href="{prefix}assets/assistance.css?v={STAMP}" data-sq-assistance-style>\n'+s[idx:]
    if 'data-sq-help-core' not in s:
        marker='<script src="'+prefix+'assets/docs.js'
        if marker not in s:marker='<script>\nconst SEARCH_DATA'
        idx=s.index(marker);s=s[:idx]+f'<script src="{prefix}assets/help-core.js?v={STAMP}" data-sq-help-core></script>'+s[idx:]
    if 'data-sq-assistance-script' not in s:s=s.replace('</body>',f'<script defer src="{prefix}assets/assistance.js?v={STAMP}" data-sq-assistance-script></script>\n</body>')
    f.write_text(s)

class GuideParser(HTMLParser):
    def __init__(self):super().__init__();self.h1=False;self.skip=0;self.title=[];self.text=[];self.noindex=False;self.desc=''
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if tag in ('script','style'):self.skip+=1
        if tag=='h1':self.h1=True
        if tag=='meta' and d.get('name')=='robots':self.noindex='noindex' in d.get('content','')
        if tag=='meta' and d.get('name')=='description':self.desc=d.get('content','')
    def handle_endtag(self,tag):
        if tag=='h1':self.h1=False
        if tag in ('script','style'):self.skip=max(0,self.skip-1)
    def handle_data(self,s):
        if not self.skip:
            self.text.append(s)
            if self.h1:self.title.append(s)
public=[]
critical=['workspace/workspace-activation.html','workspace/workspace-login.html','workspace/workspace-documents.html','workspace/workspace-installation.html','access-help.html','diagnostic.html']
for f in paths:
    s=f.read_text();p=GuideParser();p.feed(s);rel=f.relative_to(ROOT).as_posix()
    if p.noindex or not p.title or ('class="article"' not in s and rel not in ['parcours.html','diagnostic.html','access-help.html']):continue
    category='Squared Workspace' if rel.startswith('workspace/') else 'Wix Studio' if rel.startswith('wix/') or rel=='wix-studio.html' else 'Security' if rel.startswith('security/') else 'Engineering' if rel.startswith('development/') else 'Design System' if rel.startswith('design-system/') else 'Help Center'
    public.append(dict(kind='knowledge',title=' '.join(p.title),description=p.desc,content=re.sub(r'\s+',' ',' '.join(p.text)).strip(),href=rel,category=category,featured=rel in critical))
wix_source=read('wix-studio.html');at=wix_source.index('const SEARCH_DATA=')+len('const SEARCH_DATA=')
chapters,_=json.JSONDecoder().raw_decode(wix_source[at:])
for c in chapters:
    public.append(dict(kind='knowledge',title=c['title'],description=c['text'][:200],content=c['text'],href='wix-studio.html#'+c['id'],category='Wix Studio',featured=False))
write('assets/knowledge-index.json',json.dumps(public,ensure_ascii=False,separators=(',',':')))
site=read('sitemap.xml').replace('\\n','\n')
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'};ET.register_namespace('',ns['s']);tree=ET.fromstring(site)
existing={x.text for x in tree.findall('.//s:loc',ns)}
for path in ['parcours.html','diagnostic.html','access-help.html','workspace/workspace-login.html']:
    url='https://docs.squaredgroup.studio/'+path
    if url not in existing:
        e=ET.SubElement(tree,'{'+ns['s']+'}url');ET.SubElement(e,'{'+ns['s']+'}loc').text=url
write('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n'+ET.tostring(tree,encoding='unicode'))
# Adapt existing theme test to the new explicit appearance choice (same dark assertion).
p='tests/mobile_layout.py';s=read(p);s=s.replace("page.locator('#themeBtn').click()\n            assert", "page.locator('#themeBtn').click()\n            page.get_by_label('Sombre',exact=True).check()\n            page.keyboard.press('Escape')\n            assert");write(p,s)
print(json.dumps({'public_guides_indexed':len(public),'styled_pages':sum('data-sq-help-core' in f.read_text() for f in paths)},ensure_ascii=False))
