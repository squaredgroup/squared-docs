"""Real site scripts with an isolated backend. Presentation regression suite.
No production account, ticket, message or analytics writes.
"""
import ast,functools,json,re,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
m=ast.parse((ROOT/'tests/help_center_acceptance.py').read_text())
MOCK=next(ast.literal_eval(n.value) for n in m.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='MOCK' for t in n.targets))
PAGES=['index.html','forum.html','support.html','login.html','search.html','faq.html','wix/wix-responsive.html','server-status.html','status.html','admin.html','profile.html']
checks=[]
for f in ROOT.rglob('*.html'):
    if any(x in {'.git','node_modules','test-results'} for x in f.relative_to(ROOT).parts):continue
    content=f.read_text()
    if 'assets/sidebar.css' not in content:continue
    assert content.count('data-sq-refinement-style')==1,str(f)
    assert content.count('data-sq-refinement-script')==1,str(f)
    assert content.index('data-sq-refinement-style')<content.index('data-sq-responsive'),str(f)
checks.append('Styles intégrés une seule fois et contrat mobile chargé en dernier')

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*_):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
def luminance(value):
    if len(value)==4:value='#'+''.join(x*2 for x in value[1:])
    c=[int(value[i:i+2],16)/255 for i in (1,3,5)]
    c=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c]
    return sum(v*w for v,w in zip(c,(.2126,.7152,.0722)))
def contrast(a,b):
    x,y=sorted([luminance(a),luminance(b)])
    return (y+.05)/(x+.05)

with sync_playwright() as p:
    for engine in ['chromium','webkit']:
        browser=getattr(p,engine).launch()
        for width in [390,768,1024,1440]:
            context=browser.new_context(viewport={'width':width,'height':900},is_mobile=width<861,has_touch=width<861,device_scale_factor=1)
            page=context.new_page();errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            def route(r):
                u=r.request.url
                if '@supabase/supabase-js' in u:return r.fulfill(content_type='application/javascript',body=MOCK.replace('ROLE','"anon"'))
                if 'react-ui.js' in u:return r.fulfill(content_type='application/javascript',body='export {};')
                if u.startswith(origin):return r.continue_()
                if '.supabase.co' in u:return r.fulfill(content_type='application/json',body='[]',headers={'Access-Control-Allow-Origin':'*'})
                if 'fonts.googleapis.com/' in u or 'fonts.gstatic.com/' in u:return r.continue_()
                return r.abort()
            page.route('**/*',route)
            for name in PAGES:
                for theme in ['light','dark']:
                    errors.clear()
                    page.goto(origin+'/'+name,wait_until='networkidle')
                    page.wait_for_function('Boolean(window.SQRefinement)')
                    page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
                    page.wait_for_timeout(100)
                    metrics=page.evaluate('''() => ({viewport:innerWidth,scroll:document.documentElement.scrollWidth,
                        main:document.querySelector('.app>.main').getBoundingClientRect().x,
                        bad:[...document.querySelectorAll('.topbar a,.topbar button')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').filter(e=>{const r=e.getBoundingClientRect();return r.x<0||r.right>innerWidth+2}).map(e=>e.outerHTML.slice(0,220))})''')
                    assert metrics['scroll']<=width+2,(engine,width,name,theme,'overflow',metrics)
                    assert not metrics['bad'],(engine,width,name,theme,'header',metrics)
                    if width<=860:assert abs(metrics['main'])<1,(name,'gutter',metrics)
                    assert not errors,(engine,width,name,theme,errors)
                    if name=='index.html':
                        colors=page.evaluate('''() => {const s=getComputedStyle(document.documentElement);return Object.fromEntries(['--text','--muted','--muted-2','--bg','--panel','--sq-accent-ink','--green-soft'].map(k=>[k,s.getPropertyValue(k).trim()]))}''')
                        for token in ['--text','--muted','--muted-2','--sq-accent-ink']:
                            for bg in ['--bg','--panel']:
                                ratio=contrast(colors[token],colors[bg]);assert ratio>=4.5,(theme,token,bg,ratio)
                        assert contrast(colors['--sq-accent-ink'],colors['--green-soft'])>=4.5
                        assert page.locator('.category-card h3').first.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)')>=16
                        assert page.locator('.help-hero-logo').evaluate('e=>e.complete && e.naturalWidth>0')
                    if width in [390,1440] and name in ['index.html','forum.html','support.html','login.html','wix/wix-responsive.html','server-status.html']:
                        filename=f'{engine}-{name.replace("/","-").replace(".html","")}-{theme}-{width}.png'
                        page.screenshot(path=str(OUT/filename))
                    checks.append(f'{engine} {width}px {name} {theme}: visible content and header')
            # Keyboard disclosure states must follow the existing accordion.
            page.goto(origin+'/index.html',wait_until='networkidle')
            if width<861:page.locator('#menuBtn').click()
            a=page.locator('.hc-sub-toggle').first
            a.click();assert a.get_attribute('aria-expanded')=='true'
            page.locator('#sidebar [data-group="products"] .hc-nav-group-trigger').click()
            b=page.locator('.hc-sub-toggle').nth(1)
            b.click();assert b.get_attribute('aria-expanded')=='true'
            assert a.get_attribute('aria-expanded')=='false'
            assert page.locator('.hc-item.child-open').count()==1
            if width<861:page.keyboard.press('Escape')
            page.locator('#quickActionsBtn').click()
            assert page.locator('#quickActionsBtn').get_attribute('aria-expanded')=='true'
            page.keyboard.press('Escape')
            assert page.locator('#quickActionsBtn').get_attribute('aria-expanded')=='false'
            checks.append(f'{engine} {width}px: accordion states and quick actions Escape')
            context.close()
        # Motion preference is respected, including the new loading indicator.
        context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
        page=context.new_page()
        page.route('**/*',route)
        page.goto(origin+'/index.html',wait_until='networkidle')
        page.evaluate("document.querySelector('.help-hero').insertAdjacentHTML('beforeend','<div class=loading id=motionProbe>Chargement</div>')")
        assert page.locator('#motionProbe').evaluate("e=>getComputedStyle(e,'::before').animationName")=='none'
        checks.append(f'{engine}: reduced motion respected')
        context.close();browser.close()
server.shutdown()
(OUT/'visual-refinement.json').write_text(json.dumps({'passed':True,'checks':checks,'count':len(checks),'backend':'isolated mock','scope':'layout, selected contrast tokens, keyboard disclosure, reduced motion; not a full WCAG audit'},ensure_ascii=False,indent=2))
print(json.dumps({'passed':True,'checks':len(checks),'engines':['Chromium','WebKit']},ensure_ascii=False))
