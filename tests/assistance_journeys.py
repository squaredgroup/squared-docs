"""Real frontend, isolated backend. The new assistance must never submit a ticket implicitly."""
import json,functools,threading,re,os
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
MOCK=r'''
let current=ROLE==='anon'?null:{id:'11111111-1111-4111-8111-111111111111',role:ROLE==='admin'?'admin':'member',is_banned:false,display_name:'Compte isolé',username:'qa'};
const listeners=[],writes=[];window.__writes=writes;
window.__signOut=()=>{current=null;for(const fn of listeners)fn('SIGNED_OUT',null);};
const topic={id:'22222222-2222-4222-8222-222222222222',title:'Connexion au portail',body:'Réponse publique de test à revoir.',author_id:'11111111-1111-4111-8111-111111111111',category_id:'cat',status:'open',reply_count:0,vote_score:0,view_count:0,is_pinned:false,accepted_reply_id:null,created_at:'2026-09-18T12:00:00Z',last_activity_at:'2026-09-18T12:00:00Z'};
const fixtures={forum_topics:[topic],forum_categories:[{id:'cat',slug:'questions',name:'Questions',description:'Questions',kind:'question',sort_order:1}],forum_replies:[],notifications:[],forum_bookmarks:[],forum_votes:[],forum_reactions:[],knowledge_documents:[],document_revisions:[],support_tickets:[{id:'33333333-3333-4333-8333-333333333333',ticket_number:12,subject:'SUJET PRIVE TEST',requester_id:'11111111-1111-4111-8111-111111111111',product:'Squared Workspace',category:'account',status:'waiting_user',last_activity_at:'2026-09-19T00:00:00Z'}],service_components:[{id:'service-ws',product:'Squared Workspace',public:true,enabled:true}],incidents:[]};
function query(name,args={}){let one=false,head=false,filters=[],mutating=false;
 const q={};for(const m of ['select','eq','neq','order','is','limit','in','range','not','gte','lte','abortSignal'])q[m]=(...a)=>{if(m==='select')head=a[1]?.head||false;if(m==='eq')filters.push(a);return q;};
 for(const m of ['insert','update','upsert','delete'])q[m]=(...a)=>{writes.push({table:name,method:m,args:a});mutating=true;return q;};
 q.single=q.maybeSingle=()=>{one=true;return q;};
 q.then=(resolve,reject)=>{
 let data=name==='profiles'?(current?[current]:[]):structuredClone(fixtures[name]||[]),error=null;
 if(name==='search_help_center'){
  if(window.__offline)error={message:'Offline simulated'};
  data=[{kind:'knowledge',title:'Résultat '+args.p_query,description:'Réponse de test',category:'Help Center',href:'access-help.html'}];
  if(args.p_query==='injection')data=[{kind:'knowledge',title:'<img src=x onerror=alert(1)>',description:'<svg onload=alert(2)>',href:'javascript:alert(1)'}];
  if(args.p_query==='private')data=[{kind:'ticket',title:'TICKET PRIVE RETARDE',description:'Donnée de test',category:'Help Center',href:'support-ticket.html?id=33333333-3333-4333-8333-333333333333'}];
 }
 if(name==='support_tickets'&&!current&&!mutating)data=[];
 if(Array.isArray(data)){for(const [k,v] of filters)data=data.filter(x=>x[k]===v);}
 if(mutating&&name==='support_tickets')data={id:'33333333-3333-4333-8333-333333333333',ticket_number:12};
 const count=Array.isArray(data)?data.length:data?1:0;if(one&&Array.isArray(data))data=data[0]||null;
 const delay=args.p_query==='lente'||args.p_query==='private'?750:(name==='support_tickets'&&window.__slowTickets?800:8);
 return new Promise(r=>setTimeout(()=>r({data:head?null:data,error,count}),delay)).then(resolve,reject);
 };return q;
}
export function createClient(){return {from:n=>query(n),rpc:(n,args)=>query(n,args),auth:{getSession:async()=>({data:{session:current?{user:current,access_token:'TEST_ONLY'}:null},error:null}),onAuthStateChange:fn=>{listeners.push(fn);return{data:{subscription:{unsubscribe(){}}}};},signOut:async()=>{window.__signOut();return{error:null};},signInWithPassword:async()=>({error:null})},channel:()=>({on(){return this;},subscribe(fn){if(fn)setTimeout(()=>fn('SUBSCRIBED'),10);return this;}}),removeChannel:async()=>{},storage:{from:()=>({})}};}
'''
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
checks=[]
for f in ROOT.rglob('*.html'):
 if any(x in {'.git','.reference','node_modules','test-results'} for x in f.relative_to(ROOT).parts):continue
 s=f.read_text()
 if 'assets/sidebar.css' not in s:continue
 assert s.count('data-sq-help-core')==1,f
 assert s.count('data-sq-assistance-script')==1,f
 assert s.index('data-sq-assistance-style')<s.index('data-sq-responsive'),f
checks.append('Intégration unique et contrat mobile chargé en dernier')
with sync_playwright() as p:
 for engine in os.environ.get('TEST_ENGINES','chromium,webkit').split(','):
  browser=getattr(p,engine).launch()
  def new(role='anon',width=390):
   context=browser.new_context(viewport={'width':width,'height':900},is_mobile=width<861,has_touch=width<861,service_workers='block');page=context.new_page();errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    u=r.request.url
    if '@supabase/supabase-js' in u:return r.fulfill(content_type='application/javascript',body=MOCK.replace('ROLE',json.dumps(role)))
    if '/assets/react-ui.js' in u:return r.fulfill(content_type='application/javascript',body='export {};')
    if u.startswith(origin) or 'fonts.googleapis.com/' in u or 'fonts.gstatic.com/' in u:return r.continue_()
    if '.supabase.co' in u:return r.fulfill(content_type='application/json',body='[]',headers={'Access-Control-Allow-Origin':'*'})
    return r.abort()
   page.route('**/*',route);return page,context,errors
  for width in [320,390,768,1024,1440]:
   page,ctx,errors=new(width=width)
   for path in ['index.html','parcours.html?profil=client','diagnostic.html','access-help.html','workspace/workspace-activation.html','workspace/workspace-login.html','workspace/workspace-documents.html','workspace/workspace-installation.html','support.html','wix-studio.html']:
    errors.clear();page.goto(origin+'/'+path,wait_until='networkidle');page.wait_for_function('Boolean(window.SQHelp)')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),(engine,width,path,'overflow')
    assert not errors,(engine,width,path,errors)
    if width<=860:assert page.locator('.app>.main').bounding_box()['x']==0
    if path=='support.html':
     assert page.locator('#supportGuest').is_visible();assert not page.locator('[data-auth-area]').first.is_visible();assert not page.locator('#ticketForm').is_visible();assert not page.locator('#ticketList').inner_text()
    checks.append(f'{engine} {width} {path}: contenu et marges')
   page.goto(origin+'/index.html',wait_until='networkidle')
   page.locator('#themeBtn').click();page.get_by_label('Sombre',exact=True).check();assert page.locator('html').get_attribute('data-theme')=='dark'
   page.get_by_label('Système',exact=True).check();page.emulate_media(color_scheme='light');page.wait_for_timeout(60);assert page.locator('html').get_attribute('data-theme')=='light'
   page.get_by_label('Clair',exact=True).check();page.emulate_media(color_scheme='dark');assert page.locator('html').get_attribute('data-theme')=='light';page.keyboard.press('Escape')
   assert page.locator('#themeBtn').get_attribute('aria-expanded')=='false'
   if width in [390,1440]:page.screenshot(path=str(OUT/f'journey-home-{engine}-{width}.png'))
   checks.append(f'{engine} {width}: apparence explicite et préférence système')
   ctx.close()
  for issue in ['access','documents','installation']:
   page,ctx,errors=new(width=390);page.goto(origin+'/diagnostic.html?product=workspace&issue='+issue,wait_until='networkidle')
   page.get_by_role('button',name='Continuer',exact=True).click();page.get_by_role('button',name='Continuer',exact=True).click();page.get_by_label('iPhone',exact=True).check();page.get_by_role('button',name='Voir les vérifications',exact=True).click()
   page.locator('.sq-checklist input').nth(1).check();target=page.get_by_role('link',name='Préparer ma demande privée',exact=True).get_attribute('href');query=parse_qs(urlparse(target).query)
   assert query['issue']==[issue] and query['checks']==['1'] and query['device']==['ios']
   assert not page.evaluate('__writes.filter(x=>x.table==="support_tickets").length')
   page.get_by_role('button',name='Mon problème est résolu',exact=True).click();assert 'Aucun ticket' in page.locator('#diagnosticMount').inner_text()
   if issue=='documents':page.screenshot(path=str(OUT/f'journey-diagnostic-{engine}.png'),full_page=True)
   page.goto(target,wait_until='networkidle');assert page.locator('#supportGuest').is_visible()
   next_url=page.locator('#supportLogin').get_attribute('href');assert parse_qs(urlparse(next_url).query)['next'][0].startswith('support.html?')
   if issue=='documents':page.screenshot(path=str(OUT/f'journey-support-guest-{engine}.png'))
   assert not errors,errors;checks.append(engine+' diagnostic '+issue+': aucune mutation implicite et contexte conservé');ctx.close()
  page,ctx,errors=new('member',width=390)
  page.goto(origin+'/support.html?diagnostic=1&product=workspace&issue=documents&device=ios&checks=1',wait_until='networkidle')
  assert page.locator('#ticketForm').is_visible();assert page.locator('#ticketProduct').input_value()=='Squared Workspace';assert 'Documents' in page.locator('#ticketDescription').input_value()
  assert 'SUJET PRIVE TEST' in page.locator('#ticketList').inner_text()
  page.evaluate('__signOut()');page.wait_for_timeout(80)
  assert not page.locator('[data-auth-area]').first.is_visible();assert 'SUJET PRIVE TEST' not in page.locator('body').inner_text();assert page.locator('#ticketDescription').input_value()==''
  checks.append(engine+' support: préremplissage puis suppression de la vue privée à la déconnexion');ctx.close()
  page,ctx,errors=new('member',width=1440)
  page.goto(origin+'/index.html',wait_until='networkidle');assert page.locator('#helpResume').is_visible();assert 'SUJET PRIVE TEST' in page.locator('#helpResume').inner_text();page.evaluate('__signOut()');assert not page.locator('#helpResume').is_visible()
  page.goto(origin+'/search.html',wait_until='networkidle');i=page.locator('#universalSearchInput');i.fill('lente');page.wait_for_timeout(220);i.fill('rapide');page.get_by_text('Résultat rapide',exact=True).wait_for();page.wait_for_timeout(850);assert not page.get_by_text('Résultat lente',exact=True).count()
  i.fill('injection');page.wait_for_timeout(450);assert not page.locator('#universalSearchResults img').count();assert not page.locator('#universalSearchResults a[href^="javascript:"]').count()
  i.fill('private');page.wait_for_timeout(220);page.evaluate('__signOut()');page.wait_for_timeout(850);assert 'TICKET PRIVE RETARDE' not in page.locator('#universalSearchResults').inner_text()
  page.evaluate('window.__offline=true');i.fill('Workspace activation');page.locator('.sq-search-notice').wait_for();assert page.locator('.universal-result').count()>0
  assert not errors,errors;checks.append(engine+' recherche: sources sûres, réponse tardive rejetée, déconnexion et mode partiel');ctx.close()
  page,ctx,errors=new('admin',width=1440)
  page.goto(origin+'/editorial.html?source=22222222-2222-4222-8222-222222222222',wait_until='networkidle');page.locator('#edBody').wait_for();page.wait_for_timeout(200)
  assert page.locator('#edTitle').input_value()=='Connexion au portail';assert page.locator('#edState').input_value()=='draft';assert 'Réponse publique' in page.locator('#edBody').input_value();assert not page.evaluate('__writes.some(x=>x.table==="knowledge_documents")')
  assert not errors,errors;checks.append(engine+' article depuis forum: préparation non enregistrée et non publiée');ctx.close()
  browser.close()
server.shutdown()
(OUT/'assistance-journeys.json').write_text(json.dumps({'passed':True,'checks':checks,'count':len(checks),'backend':'isolated mock; no production mutations'},ensure_ascii=False,indent=2))
print(json.dumps({'passed':True,'checks':len(checks)},ensure_ascii=False))
