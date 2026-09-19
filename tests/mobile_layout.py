"""Mobile geometry and drawer tests. Backend is mocked; no production writes.
Checks the real HTML, CSS, navigation, docs, account and forum scripts.
"""
import ast
import functools
import json
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
module = ast.parse((ROOT / 'tests/help_center_acceptance.py').read_text())
MOCK = next(ast.literal_eval(n.value) for n in module.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'MOCK' for t in n.targets))
PAGES = ['index.html','forum.html','support.html','login.html','search.html','faq.html','wix/wix-responsive.html','server-status.html','status.html','account-settings.html','admin.html']
WIDTHS = [320,375,390,430,600,768,860]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass

server = ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'
results = []

with sync_playwright() as p:
    for engine in ['chromium','webkit']:
        browser = getattr(p, engine).launch()
        def new_page(width=390, role='anon', baseline=False):
            context = browser.new_context(viewport={'width':width,'height':844},device_scale_factor=1,has_touch=True,is_mobile=True)
            page = context.new_page()
            errors = []
            page.on('pageerror',lambda error:errors.append(str(error)))
            def route(r):
                url = r.request.url
                if baseline and '/assets/responsive.css' in url:
                    return r.fulfill(content_type='text/css',body='')
                if baseline and '/assets/mobile-nav.js' in url:
                    return r.fulfill(content_type='application/javascript',body='')
                if '@supabase/supabase-js' in url:
                    return r.fulfill(content_type='application/javascript',body=MOCK.replace('ROLE',json.dumps(role)))
                if '/assets/react-ui.js' in url:
                    return r.fulfill(content_type='application/javascript',body='export {};')
                if url.startswith(origin): return r.continue_()
                if '.supabase.co' in url:
                    return r.fulfill(content_type='application/json',body='[]',headers={'Access-Control-Allow-Origin':'*'})
                # Fonts are the only external resources allowed in these isolated tests.
                if 'fonts.googleapis.com/' in url or 'fonts.gstatic.com/' in url: return r.continue_()
                return r.abort()
            page.route('**/*',route)
            return context,page,errors

        if engine == 'chromium':
            context,page,errors = new_page(baseline=True)
            page.goto(origin + '/index.html')
            page.wait_for_timeout(250)
            before = page.locator('.app > .main').bounding_box()
            print('BASELINE_390_MAIN',json.dumps(before))
            page.screenshot(path=str(OUT/'mobile-before-390.png'))
            context.close()

        for width in WIDTHS:
            context,page,errors = new_page(width)
            for name in PAGES:
                errors.clear()
                page.goto(origin + '/' + name,wait_until='networkidle')
                page.wait_for_function('Boolean(window.SQMobileNavigation)')
                metrics = page.evaluate('''() => {
                  const main=document.querySelector('.app>.main'),r=main.getBoundingClientRect();
                  return {left:r.left,width:r.width,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
                    overflow:[...document.querySelectorAll('.main *')].filter(e=>{const x=e.getBoundingClientRect();return x.width>0&&(x.right>innerWidth+2||x.left < -2)&&getComputedStyle(e).position!=='fixed'}).slice(0,8).map(e=>({tag:e.tagName,cls:e.className,id:e.id,right:e.getBoundingClientRect().right}))};
                }''')
                assert abs(metrics['left']) <= 1, (engine,width,name,'desktop gutter',metrics)
                assert abs(metrics['width']-width) <= 2, (engine,width,name,'main width',metrics)
                assert metrics['scrollWidth'] <= width+2, (engine,width,name,'horizontal overflow',metrics)
                controls = page.locator('.topbar').evaluate('''bar => [...bar.querySelectorAll('button,a')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>({label:e.getAttribute('aria-label')||e.textContent,r:{x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}}))''')
                for c in controls:
                    assert c['r']['x'] >= -1 and c['r']['right'] <= width+1, (engine,width,name,'clipped control',c)
                assert not errors, (engine,width,name,'javascript errors',errors)
                if name == 'index.html':
                    hero = page.locator('.help-hero').bounding_box()
                    search = page.locator('.help-search').bounding_box()
                    # Full phone width minus 16px gutters; tablets retain a 680px reading measure.
                    expected_hero = min(width - 32, 680)
                    assert abs(hero['width'] - expected_hero) <= 2, (engine,width,'narrow hero',hero)
                    assert search['height'] >= 52 and abs(search['width'] - expected_hero) <= 2, (engine,width,'search sizing',search)
                    text = page.locator('.help-hero h1').evaluate('''e=>{const r=document.createRange();r.selectNodeContents(e);return [...r.getClientRects()].filter(x=>x.width>0).map(x=>({left:x.left,right:x.right,top:x.top}))}''')
                    assert all(r['left']>=-1 and r['right']<=width+1 for r in text), (engine,width,'clipped title',text)
                    if width<=430: assert len(set(round(r['top']) for r in text))<=4, (engine,width,'excessive title wrapping',text)
                    if width in [390,768]:
                        page.screenshot(path=str(OUT/f'{engine}-home-{width}.png'))
                        if engine=='chromium' and width==390:
                            page.screenshot(path=str(OUT/'mobile-home-preview.jpg'),type='jpeg',quality=55)
                results.append(f'{engine} {width}px {name}: width and controls OK')
            context.close()

        # A real authenticated account header rendered against fake data.
        for role in ['member','admin']:
            context,page,errors = new_page(390,role)
            page.goto(origin+'/index.html',wait_until='networkidle')
            page.locator('.account-chip').wait_for()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'), (engine,role,'header overflow')
            page.locator('#menuBtn').click()
            page.locator('#sqMobileClose').wait_for(state='visible')
            assert page.locator('.main').evaluate('e=>e.inert')
            assert page.locator('#sidebar').get_attribute('aria-modal')=='true'
            page.locator('#sqMobileLogout').wait_for(state='visible')
            page.locator('#sidebar .hc-sub-toggle').first.click()
            page.locator('#sidebar .hc-sub-toggle').nth(1).click()
            assert page.locator('.hc-item.child-open').count()<=1
            page.keyboard.press('Escape')
            assert page.locator('#sidebar').evaluate('e=>e.inert')
            assert not page.locator('.main').evaluate('e=>e.inert')
            page.locator('#menuBtn').click()
            page.locator('#sqMobileBackdrop').click(position={'x':380,'y':400})
            assert page.locator('#menuBtn').get_attribute('aria-expanded')=='false'
            page.locator('.help-search').click()
            page.locator('#searchModal.open').wait_for(state='visible')
            page.locator('#searchInput').fill('responsive')
            assert page.locator('#searchInput').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)>=16')
            page.keyboard.press('Escape')
            assert not page.locator('#themeBtn').is_visible()
            page.locator('#quickActionsBtn').click()
            page.get_by_role('button',name='Apparence').click()
            page.get_by_label('Sombre',exact=True).check()
            page.keyboard.press('Escape')
            assert page.locator('html').get_attribute('data-theme')=='dark'
            if role=='member': page.screenshot(path=str(OUT/f'{engine}-home-dark-390.png'))
            # A remembered desktop mini-mode must never reserve space on mobile.
            page.evaluate("document.body.classList.add('sidebar-mini')")
            assert page.locator('.main').bounding_box()['x']==0
            page.set_viewport_size({'width':1440,'height':900})
            assert not page.locator('.main').evaluate('e=>e.inert')
            assert page.locator('.main').bounding_box()['x']>=60
            page.evaluate("document.body.classList.remove('sidebar-mini')")
            assert page.locator('.main').bounding_box()['x']>=230
            page.set_viewport_size({'width':430,'height':844})
            assert page.locator('.main').bounding_box()['x']==0
            assert not errors, (engine,role,errors)
            results.append(f'{engine} {role}: drawer, accordion, search, theme and resize OK')
            context.close()
        browser.close()
server.shutdown()
(OUT/'mobile-layout.json').write_text(json.dumps({'passed':True,'checks':results,'backend':'isolated mock; no production account or mutation'},ensure_ascii=False,indent=2))
print(json.dumps({'passed':True,'checks':len(results),'engines':['Chromium','WebKit'],'widths':WIDTHS+[1440]},ensure_ascii=False))
