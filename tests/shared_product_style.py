"""Render the real Help Center scripts against isolated fixtures; no production writes."""
import ast,functools,json,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results/shared-product';OUT.mkdir(parents=True,exist_ok=True)
source=ast.parse((ROOT/'tests/help_center_acceptance.py').read_text())
MOCK=next(ast.literal_eval(n.value) for n in source.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='MOCK' for t in n.targets)).replace('ROLE','"anon"')
PAGES=['index.html','guides.html','support.html','forum.html','login.html','faq.html','search.html','profile.html','server-status.html','workspace/workspace-login.html','wix/wix-responsive.html','wix-studio.html']
checks=[]
for path in ROOT.rglob('*.html'):
 if any(part in {'.git','node_modules','test-results'} for part in path.parts):continue
 html=path.read_text()
 if 'assets/sidebar.js' not in html:continue
 assert html.count('data-sq-shared-ui')==1,path
 assert html.count('data-sq-workspace-help')==1,path
 assert 'fonts.googleapis.com' not in html,path
 checks.append({'page':str(path.relative_to(ROOT)),'shared_styles':True})
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch()
  for width in [390,320,768,1440]:
   context=browser.new_context(viewport={'width':width,'height':960},reduced_motion='reduce')
   def route(request):
    url=request.request.url
    if '@supabase/supabase-js' in url:return request.fulfill(content_type='application/javascript',body=MOCK)
    if 'react-ui.js' in url:return request.fulfill(content_type='application/javascript',body='export {};')
    if url.startswith(origin):return request.continue_()
    if '.supabase.co' in url:return request.fulfill(content_type='application/json',body='[]',headers={'Access-Control-Allow-Origin':'*'})
    return request.abort()
   context.route('**/*',route)
   page=context.new_page()
   for name in PAGES:
    page.goto(origin+'/'+name,wait_until='networkidle')
    page.wait_for_selector('.hc-nav-link',state='attached')
    for theme in ['light','dark']:
     page.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
     page.evaluate('()=>document.fonts.ready')
     metrics=page.evaluate('''()=>{
      const root=getComputedStyle(document.documentElement),bar=document.querySelector('.topbar');
      const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
      return {scroll:document.documentElement.scrollWidth,main:document.querySelector('.app>.main').getBoundingClientRect().x,
       background:root.getPropertyValue('--sq-bg').trim(),font:document.fonts.check('13px "Space Grotesk"'),
       navFont:getComputedStyle(document.querySelector('.hc-nav-link')).fontSize,
       overflowElements:[...document.querySelectorAll('.main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,width:Math.round(e.getBoundingClientRect().width)})),
       bad:[...bar.querySelectorAll('a,button')].filter(visible).filter(e=>{const r=e.getBoundingClientRect();return r.x<0||r.right>innerWidth+1}).map(e=>e.outerHTML.slice(0,150)),
       nonIconly:[...bar.querySelectorAll('svg')].filter(visible).filter(e=>!e.classList.contains('sq-iconly')).length,
       menu:document.querySelector('#menuBtn').getBoundingClientRect().x,
       title:bar.querySelector('.sq-mobile-location')?.getBoundingClientRect().x
      };
     }''')
     assert metrics['scroll']<=width+1,(name,width,theme,'overflow',metrics)
     assert not metrics['bad'],(name,width,theme,'topbar overflow',metrics)
     assert metrics['background']==('#f6f7f9' if theme=='light' else '#0e1013'),(name,width,theme,metrics)
     assert metrics['font'],(name,width,theme,'font unavailable')
     assert not metrics['nonIconly'],(name,width,theme,'non Iconly header icons')
     if width<=860:
      assert metrics['main']==0,(name,width,theme,metrics)
      assert metrics['menu']>metrics['title'],(name,width,theme,'menu must be on right')
     if width in [390,1440] and name in ['index.html','support.html','forum.html','login.html','workspace/workspace-login.html']:
      page.screenshot(path=str(OUT/f'{name.replace("/","-").replace(".html","")}-{theme}-{width}.png'),animations='disabled')
     checks.append({'page':name,'width':width,'theme':theme,'layout':True})
   page.goto(origin+'/index.html',wait_until='networkidle')
   if width<=860:
    page.locator('#menuBtn').click()
    assert page.locator('#sidebar').get_attribute('aria-hidden')=='false'
    assert page.locator('.app>.main').evaluate('e=>e.inert')
    first=page.locator('#sidebar .hc-sub-toggle').first
    first.click()
    assert first.get_attribute('aria-expanded')=='true'
    page.keyboard.press('Escape')
    assert page.locator('#sidebar').get_attribute('aria-hidden')=='true'
    assert not page.locator('.app>.main').evaluate('e=>e.inert')
   page.locator('.help-search').click()
   page.locator('#searchInput').fill('document')
   assert page.locator('#searchModal').evaluate('e=>e.getClientRects().length>0')
   page.keyboard.press('Escape')
   before=page.locator('html').get_attribute('data-theme')
   page.locator('#themeBtn').click()
   page.locator('[name="sq-appearance"][value="'+('dark' if before=='light' else 'light')+'"]').check()
   assert page.locator('html').get_attribute('data-theme')!=before
   checks.append({'width':width,'menu_search_theme':True})
   context.close()
  MOCK=MOCK.replace('"anon"','"member"')
  for width in [390,1440]:
   context=browser.new_context(viewport={'width':width,'height':960},reduced_motion='reduce')
   context.route('**/*',route)
   page=context.new_page()
   page.goto(origin+'/support.html',wait_until='networkidle')
   page.wait_for_selector('#ticketForm')
   assert not page.locator('#supportGuest').is_visible()
   for theme in ['light','dark']:
    page.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    page.screenshot(path=str(OUT/f'support-member-{theme}-{width}.png'),animations='disabled')
    checks.append({'page':'support.html','role':'member','width':width,'theme':theme,'ticket_form':True})
   context.close()
  browser.close()
finally:
 server.shutdown()
 (OUT/'checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
print(f'{len(checks)} shared style, responsive and interaction checks passed.')
