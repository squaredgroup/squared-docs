"""Real-site mobile regression checks. All external services isolated; no live writes.
Chromium: every Help Center HTML route at 390px. Chromium + WebKit: functional
mobile/tablet/landscape checks. Not a physical-device or production-backend test.
"""
import ast
import functools
import json
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
module=ast.parse((ROOT/'tests/help_center_acceptance.py').read_text())
MOCK=next(ast.literal_eval(n.value) for n in module.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='MOCK' for t in n.targets))
PAGES=[p.relative_to(ROOT).as_posix() for p in sorted(ROOT.rglob('*.html')) if not any(x in {'.git','node_modules','test-results','.venv'} for x in p.relative_to(ROOT).parts) and 'data-sq-mobile-nav' in p.read_text(encoding='utf-8')]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
checks=[];failures=[]
report={'passed':False,'checks':checks,'failures':failures,'backend':'isolated mock; no production data or mutations','physical_devices_tested':False}

def attach_routes(page,role='anon'):
    def route(r):
        url=r.request.url
        if '@supabase/supabase-js' in url:
            return r.fulfill(content_type='application/javascript',body=MOCK.replace('ROLE',json.dumps(role)))
        if '/assets/react-ui.js' in url:
            return r.fulfill(content_type='application/javascript',body='export {};')
        if url.startswith(origin):return r.continue_()
        if '.supabase.co' in url:
            return r.fulfill(content_type='application/json',body='[]',headers={'Access-Control-Allow-Origin':'*'})
        return r.abort()
    page.route('**/*',route)

def geometry(page,label):
    data=page.evaluate('''() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,left:document.querySelector('.main').getBoundingClientRect().left,overflow:[...document.querySelectorAll('.main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+2&&!e.closest('.sq-mobile-table-scroll,pre,.code,.search-filters')}).slice(0,6).map(e=>({tag:e.tagName,id:e.id,cls:String(e.className)}))})''')
    assert data['scrollWidth']<=data['width']+2,(label,'horizontal overflow',data)
    if data['width']<=860:assert abs(data['left'])<=1,(label,'desktop gutter',data)

try:
    with sync_playwright() as p:
        for engine in ['chromium','webkit']:
            browser=getattr(p,engine).launch()
            if engine=='chromium':
                context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
                page=context.new_page();attach_routes(page);errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                for name in PAGES:
                    errors.clear()
                    try:
                        page.goto(origin+'/'+name,wait_until='domcontentloaded')
                        page.wait_for_function('Boolean(window.SQMobileExperience)',timeout=10000)
                        page.wait_for_timeout(150)
                        geometry(page,name)
                        assert not errors,(name,'javascript',errors)
                        assert page.locator('#sqMobileDock').count()==1,(name,'duplicate dock')
                        checks.append(f'Chromium 390px {name}: geometry, loader and JavaScript OK')
                    except Exception as error:
                        failures.append(str(error));print('ROUTE_FAILURE',name,str(error),flush=True)
                context.close()
            for width,height in [(320,640),(390,844),(768,1024),(844,390)]:
                context=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
                page=context.new_page();attach_routes(page,'member');errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                label=f'{engine} {width}x{height}'
                try:
                    page.goto(origin+'/index.html',wait_until='networkidle');page.wait_for_function('Boolean(window.SQMobileExperience)')
                    geometry(page,label)
                    for item in page.locator('#sqMobileDock > *').all():
                        r=item.bounding_box();assert r['width']>=44 and r['height']>=44,(label,'touch target',r)
                    page.locator('#sqDockMenu').click();page.locator('#sqMobileClose').wait_for(state='visible')
                    assert page.locator('.main').evaluate('e=>e.inert'),label
                    page.keyboard.press('Escape');page.wait_for_timeout(50)
                    assert not page.locator('.main').evaluate('e=>e.inert'),label
                    page.locator('#sqDockSearch').click();page.locator('#searchInput').fill('responsive')
                    page.locator('#sqSearchClear').wait_for(state='visible')
                    assert page.locator('.app').evaluate('e=>e.inert'),label
                    page.locator('#sqSearchClear').click();assert page.locator('#searchInput').input_value()==''
                    for _ in range(9):
                        page.keyboard.press('Tab')
                        assert page.locator('#searchModal').evaluate('e=>e.contains(document.activeElement)'),(label,'focus escaped search')
                    page.keyboard.press('Escape');page.wait_for_timeout(50)
                    assert page.locator('#sqDockSearch').evaluate('e=>e===document.activeElement'),(label,'search focus not restored')
                    assert not page.locator('.app').evaluate('e=>e.inert'),label
                    if width==390:
                        page.screenshot(path=str(OUT/f'{engine}-mobile-v2-home-light.png'),full_page=True)
                    page.locator('#themeBtn').click();page.get_by_label('Sombre',exact=True).check();page.keyboard.press('Escape')
                    assert page.locator('html').get_attribute('data-theme')=='dark'
                    if width==390:page.screenshot(path=str(OUT/f'{engine}-mobile-v2-home-dark.png'),full_page=True)
                    page.goto(origin+'/wix/wix-responsive.html?token=never-share',wait_until='networkidle')
                    page.wait_for_function('Boolean(window.SQMobileExperience)');geometry(page,label+' article')
                    assert page.locator('#sqArticleOutline').count()==1,label
                    page.locator('#sqArticleOutline').click();page.locator('#sqMobileSheet[open]').wait_for()
                    target=page.locator('.sq-mobile-outline a').nth(1).get_attribute('href')
                    page.locator('.sq-mobile-outline a').nth(1).click();page.wait_for_timeout(450)
                    assert page.evaluate('location.hash')==target,(label,'article anchor')
                    page.locator('#sqReadingSize').click()
                    assert page.locator('#sqReadingSize').get_attribute('aria-pressed')=='true'
                    page.evaluate("Object.defineProperty(navigator,'share',{value:undefined,configurable:true});Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.testCopiedURL=text},configurable:true})")
                    page.locator('#sqShareArticle').click();page.wait_for_function('Boolean(window.testCopiedURL)')
                    assert 'token=' not in page.evaluate('window.testCopiedURL'),(label,'private query leaked')
                    before=page.evaluate('scrollY');page.locator('#sqDockMenu').click();page.wait_for_timeout(50);page.keyboard.press('Escape');page.wait_for_timeout(100)
                    assert abs(page.evaluate('scrollY')-before)<3,(label,'scroll position lost')
                    page.evaluate("Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true});dispatchEvent(new Event('offline'))")
                    assert page.locator('.sq-mobile-network').is_visible()
                    page.evaluate("Object.defineProperty(navigator,'onLine',{get:()=>true,configurable:true});dispatchEvent(new Event('online'))")
                    assert page.locator('.sq-mobile-network').is_hidden()
                    page.evaluate("const t=document.createElement('table');t.innerHTML='<tr><th>Produit</th><th>Description</th><th>Statut</th><th>Version</th></tr><tr><td>Workspace</td><td>Une description longue</td><td>Test</td><td>1</td></tr>';document.querySelector('.article').append(t)")
                    page.locator('.sq-mobile-table-scroll').last.wait_for();geometry(page,label+' table')
                    if width==390:page.screenshot(path=str(OUT/f'{engine}-mobile-v2-article.png'))
                    page.set_viewport_size({'width':1440,'height':900});page.wait_for_timeout(100)
                    assert page.locator('#sqMobileDock').is_hidden();assert not page.locator('.main').evaluate('e=>e.inert')
                    assert not errors,(label,errors)
                    checks.append(label+': dock, drawer, search focus, themes, outline, reading, sharing, offline, table and resize OK')
                except Exception as error:
                    failures.append(str(error));print('FUNCTION_FAILURE',label,str(error),flush=True)
                    page.screenshot(path=str(OUT/f'failure-{engine}-{width}.png'))
                finally:context.close()
            browser.close()
    report['passed']=not failures
finally:
    server.shutdown()
    (OUT/'mobile-experience.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({'passed':report['passed'],'checks':len(checks),'failures':len(failures),'pages':len(PAGES)},ensure_ascii=False))
assert not failures,'\n'.join(failures)
