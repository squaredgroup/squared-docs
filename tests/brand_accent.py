"""Computed brand color regression; isolated anonymous backend, no production writes."""
import ast
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
source = ast.parse((ROOT/'tests/help_center_acceptance.py').read_text())
MOCK = next(ast.literal_eval(n.value) for n in source.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='MOCK' for t in n.targets))
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server = ThreadingHTTPServer(('127.0.0.1',0), functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'
checks=[]
def route(r):
    u=r.request.url
    if '@supabase/supabase-js' in u:
        return r.fulfill(content_type='application/javascript',body=MOCK.replace('ROLE','"anon"'))
    if 'react-ui.js' in u:
        return r.fulfill(content_type='application/javascript',body='export {};')
    if u.startswith(origin): return r.continue_()
    if '.supabase.co' in u:
        return r.fulfill(content_type='application/json',body='[]',headers={'Access-Control-Allow-Origin':'*'})
    if 'fonts.googleapis.com/' in u or 'fonts.gstatic.com/' in u: return r.continue_()
    return r.abort()

def contrast(a,b):
    def lum(v):
        channels = [float(x)/255 for x in v.removeprefix('rgb(').removesuffix(')').split(',')]
        return sum((x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4)*w for x,w in zip(channels,(.2126,.7152,.0722)))
    x,y=sorted((lum(a),lum(b)))
    return (y+.05)/(x+.05)

try:
    with sync_playwright() as p:
        for engine in ('chromium','webkit'):
            browser=getattr(p,engine).launch()
            for width in (320,390,860,1440):
                context=browser.new_context(viewport={'width':width,'height':900},is_mobile=width<=860,has_touch=width<=860,device_scale_factor=1)
                page=context.new_page()
                page.route('**/*',route)
                for name in ('index.html','diagnostic.html','forum.html','support.html','wix/wix-responsive.html','status.html'):
                    for theme in ('light','dark'):
                        page.goto(origin+'/'+name,wait_until='networkidle')
                        page.wait_for_function('Boolean(window.SQRefinement)')
                        page.evaluate('(v)=>document.documentElement.dataset.theme=v',theme)
                        page.wait_for_timeout(80)
                        colors=page.evaluate('''() => {
                          const root=getComputedStyle(document.documentElement);
                          return Object.fromEntries(['--green','--green-2','--sq-accent'].map(k=>[k,root.getPropertyValue(k).trim().toUpperCase()]));
                        }''')
                        assert set(colors.values())=={'#7BE84E'},(engine,width,name,theme,colors)
                        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'),(engine,width,name,theme,'overflow')
                        if width<=860:
                            assert abs(page.locator('.app>.main').evaluate('e=>e.getBoundingClientRect().x'))<1
                        buttons=page.locator('.btn.green:visible')
                        if buttons.count():
                            btn=buttons.first
                            state=btn.evaluate('e=>({bg:getComputedStyle(e).backgroundColor,ink:getComputedStyle(e).color})')
                            assert state['bg']=='rgb(123, 232, 78)',(engine,name,theme,'button',state)
                            assert contrast(state['bg'],state['ink'])>=4.5,(engine,name,theme,'button text',state)
                            if width==1440:
                                btn.hover()
                                assert btn.evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(123, 232, 78)'
                        if name=='index.html':
                            icon=page.locator('.hc-nav-link.active .hc-nav-ico').first
                            assert icon.evaluate('e=>getComputedStyle(e).color')=='rgb(123, 232, 78)',(engine,width,theme,'nav icon')
                            if engine=='webkit' and width in (390,1440):
                                page.mouse.move(0,0)
                                page.screenshot(path=str(OUT/f'accent-{theme}-{width}.png'))
                        checks.append(f'{engine} {width}px {name} {theme}: exact accent, readable primary action, layout retained')
                context.close()
            browser.close()
finally:
    server.shutdown()
(OUT/'brand-accent.json').write_text(json.dumps({'passed':True,'accent':'#7BE84E','checks':checks,'count':len(checks),'backend':'isolated anonymous mock'},ensure_ascii=False,indent=2))
print(json.dumps({'passed':True,'count':len(checks),'accent':'#7BE84E'}))
