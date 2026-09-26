"""Exercise the actual search renderer with hostile mock data, never production data."""
import ast,functools,hashlib,json,threading
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
module=ast.parse((ROOT/'tests/assistance_journeys.py').read_text())
MOCK=next(ast.literal_eval(n.value) for n in module.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='MOCK' for t in n.targets))
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
report={'passed':False,'backend':'isolated mock','checks':[],'source_sha256':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in ['assets/help-core.js','assets/search-app.js','assets/search-backend.js']}}
try:
 with sync_playwright() as p:
  for engine in ['chromium','webkit']:
   browser=getattr(p,engine).launch();ctx=browser.new_context(viewport={'width':1440,'height':900},service_workers='block');page=ctx.new_page();errors=[];dialogs=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def dialog(d):dialogs.append(d.message);d.dismiss()
   page.on('dialog',dialog)
   def route(r):
    u=r.request.url
    if '@supabase/supabase-js' in u:return r.fulfill(content_type='application/javascript',body=MOCK.replace('ROLE',json.dumps('member')))
    if '/assets/react-ui.js' in u:return r.fulfill(content_type='application/javascript',body='export {};')
    if u.startswith(origin):return r.continue_()
    if '.supabase.co' in u:return r.fulfill(content_type='application/json',body='[]',headers={'Access-Control-Allow-Origin':'*'})
    return r.abort()
   page.route('**/*',route);page.goto(origin+'/search.html',wait_until='networkidle')
   field=page.locator('#universalSearchInput');field.fill('lente');page.wait_for_timeout(220);field.fill('rapide');page.get_by_text('Résultat rapide',exact=True).wait_for();page.wait_for_timeout(850)
   assert not page.get_by_text('Résultat lente',exact=True).count()
   field.fill('injection')
   page.wait_for_function("document.querySelector('#universalSearchResults').getAttribute('aria-busy')==='false' && document.querySelector('#universalSearchResults').textContent.includes('<img src=x onerror=alert(1)>')",timeout=10000)
   state=page.locator('#universalSearchResults').evaluate("e=>({html:e.innerHTML,images:e.querySelectorAll('img').length,badLinks:[...e.querySelectorAll('a')].map(a=>a.getAttribute('href')).filter(h=>/^\\s*(javascript|data|vbscript):/i.test(h)),eventAttributes:[...e.querySelectorAll('*')].flatMap(n=>[...n.attributes].filter(a=>/^on/i.test(a.name)).map(a=>a.name))})")
   state.update({'engine':engine,'errors':errors,'dialogs':dialogs})
   (OUT/f'editorial-search-{engine}.json').write_text(json.dumps(state,ensure_ascii=False,indent=2))
   assert state['images']==0 and not state['badLinks'] and not state['eventAttributes'] and not dialogs and not errors,json.dumps(state,ensure_ascii=False)
   report['checks'].append(engine+': literal hostile title, inert description, safe destination, no event attributes or dialogs, late response ignored')
   ctx.close();browser.close()
 report['passed']=True
finally:
 server.shutdown();(OUT/'editorial-search-security.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
