"""Real static frontend, isolated backend. Public article/layout/search checks only."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
import ast,functools,threading,json,os,shutil,mimetypes
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
MANIFEST=json.loads((ROOT/'content/editorial-manifest.json').read_text())
tree=ast.parse((ROOT/'tests/assistance_journeys.py').read_text())
MOCK=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='MOCK' for t in n.targets))
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start();ORIGIN=f'http://127.0.0.1:{server.server_port}'
checks=[];failures=[];screens=[];blocked=[]
with sync_playwright() as p:
 opts={'headless':True}
 executable=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium')
 if executable:opts['executable_path']=executable
 browser=p.chromium.launch(**opts)
 def context(width=390,js=True):
  ctx=browser.new_context(viewport={'width':width,'height':844},device_scale_factor=1,is_mobile=width<861,has_touch=width<861,java_script_enabled=js,service_workers='block')
  def route(r):
   u=r.request.url
   if '@supabase/supabase-js' in u:return r.fulfill(content_type='application/javascript',body=MOCK.replace('ROLE',json.dumps('anon')))
   if '/assets/react-ui.js' in u:return r.fulfill(content_type='application/javascript',body='export {};')
   if u.startswith(ORIGIN):return r.continue_()
   blocked.append({'host':urlsplit(u).netloc,'method':r.request.method})
   if 'fonts.googleapis.com' in u:return r.fulfill(content_type='text/css',body='')
   if 'web-content/docs' in u:return r.fulfill(content_type='application/json',body='{"items":[]}',headers={'Access-Control-Allow-Origin':'*'})
   return r.abort()
  ctx.route('**/*',route);return ctx
 ctx=context();page=ctx.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 for path in MANIFEST['generated_paths']:
  errors.clear();page.goto(ORIGIN+'/'+path,wait_until='domcontentloaded');page.wait_for_timeout(100)
  try:
   assert page.locator('h1').count()==1
   assert page.locator('h1').is_visible()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'), 'horizontal overflow'
   assert page.locator('aside#sidebar').count()==1
   if page.locator('article[data-editorial-curated=true]').count():
    assert page.locator('.article-feedback-v5').count()==1
    assert page.locator('.sq-article-feedback-v8,.sq-article-context,.article-tools').count()==0
   assert not errors,errors
   checks.append('390px article '+path)
  except Exception as exc:
   failures.append({'path':path,'test':'mobile all pages','error':str(exc)})
   page.screenshot(path=str(OUT/('editorial-failed-'+path.replace('/','-')+'.png')))
 for name in ['guides.html','parcours.html','workspace/workspace-tasks.html','guide-client-demarrage.html','guide-build-carnet.html']:
  page.goto(ORIGIN+'/'+name,wait_until='domcontentloaded');page.wait_for_timeout(120)
  target=OUT/('editorial-mobile-'+name.replace('/','-')+'.png');page.screenshot(path=str(target),full_page=True);screens.append(target.name)
 page.goto(ORIGIN+'/index.html',wait_until='domcontentloaded');page.wait_for_function('Boolean(window.SQHelp)')
 for query,target in [('carnet Build','guide-build-carnet.html'),('Signaler un blocage','guide-collaborateur-blocage.html'),('Créer et mettre à jour une tâche','workspace/workspace-tasks.html'),('retour proposition','guide-client-retours.html')]:
  rows=page.evaluate('async q=>(await SQHelp.lookup(q,{remote:false,limit:20})).rows',query)
  if not any(r['href'].endswith(target) for r in rows):failures.append({'test':'search','query':query,'target':target})
  else:checks.append('Local search finds '+target)
 try:
  page.keyboard.press('Control+k');page.locator('#searchInput').fill('carnet Build');page.wait_for_timeout(600)
  assert page.locator('#searchResults a[href$="guide-build-carnet.html"]').count()>0
  page.keyboard.press('Escape');checks.append('Keyboard global search includes new Build article')
 except Exception as exc:failures.append({'test':'keyboard search','error':str(exc)})
 for key in MANIFEST['journeys']:
  page.goto(ORIGIN+'/parcours.html?profil='+key,wait_until='domcontentloaded');page.wait_for_timeout(100)
  if page.locator('#journeyMount [data-journey]:visible').count()!=1 or not page.locator(f'[data-journey="{key}"]').is_visible():failures.append({'test':'journey query preservation','key':key})
  else:checks.append('Existing journey query selects '+key)
 ctx.close()
 for width in [320,768,1440]:
  ctx=context(width);page=ctx.new_page()
  for name in ['guides.html','parcours.html','workspace/workspace-tasks.html','guide-build-carnet.html']:
   page.goto(ORIGIN+'/'+name,wait_until='domcontentloaded');page.wait_for_timeout(100)
   if not page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'):failures.append({'test':'responsive','width':width,'path':name})
   else:checks.append(f'{width}px '+name)
  if width==1440:
   for theme in ['light','dark']:
    page.goto(ORIGIN+'/guides.html',wait_until='domcontentloaded');page.wait_for_function('Boolean(window.SQHelp)');page.evaluate('t=>SQHelp.applyTheme(t)',theme);page.wait_for_timeout(120)
    target=OUT/f'editorial-library-{theme}.png';page.screenshot(path=str(target),full_page=True);screens.append(target.name)
  ctx.close()
 ctx=context(390,False);page=ctx.new_page()
 for name in ['parcours.html','guides.html','workspace/workspace-tasks.html','guide-build-acces.html']:
  page.goto(ORIGIN+'/'+name,wait_until='domcontentloaded')
  try:
   page.locator('h1').wait_for(state='visible',timeout=6000)
   assert len(page.locator('main').inner_text())>350
   checks.append('Readable without JavaScript '+name)
  except Exception as exc:
   page.screenshot(path=str(OUT/('editorial-nojs-'+name.replace('/','-')+'.png')),full_page=True)
   failures.append({'test':'no JS','path':name,'error':str(exc)[:300],'headings':page.locator('h1').evaluate_all('(els)=>els.map(e=>({text:e.textContent,rect:e.getBoundingClientRect().toJSON(),visibility:getComputedStyle(e).visibility}))')})
 if page.locator('a[href]').count()<5:failures.append({'test':'no JS navigation'})
 ctx.close();browser.close()
server.shutdown()
report={'scope':'Chromium, real HTML/JS and local index, guest fixture, external React islands disabled; no real backend writes. Font fallback used in isolated screenshots.','passed':not failures,'checks':checks,'errors':failures,'screenshots':screens,'external_calls_blocked':len(blocked),'real_external_writes':0}
(OUT/'editorial-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'passed':report['passed'],'checks':len(checks),'errors':failures},ensure_ascii=False,indent=2))
if failures:raise SystemExit(1)
