"""Capture real empty forms from a pinned Workspace checkout. No invented UI.
The source is rendered locally; backend requests are blocked. No user data is entered.
"""
import os,json,functools,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(os.environ['WORKSPACE_SOURCE'])
OUT=ROOT/'assets/guides';OUT.mkdir(parents=True,exist_ok=True)
assert (SOURCE/'js/modules/auth.js').exists()
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(SOURCE)))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
with sync_playwright() as p:
 browser=p.chromium.launch()
 context=browser.new_context(viewport={'width':1080,'height':1100},device_scale_factor=1,service_workers='block')
 page=context.new_page()
 def route(r):
  u=r.request.url
  if u.startswith(origin) or 'fonts.googleapis.com/' in u or 'fonts.gstatic.com/' in u:return r.continue_()
  return r.abort()
 page.route('**/*',route)
 page.goto(origin,wait_until='networkidle')
 page.get_by_role('heading',name='Connexion',exact=True).wait_for()
 assert page.locator('input[type="password"]').input_value()==''
 page.locator('.auth-box').screenshot(path=str(OUT/'workspace-login.png'))
 page.get_by_role('button',name='Activer un accès',exact=True).click()
 page.get_by_role('heading',name='Activer votre accès',exact=True).wait_for()
 assert all(v=='' for v in page.locator('input:not([type=checkbox])').evaluate_all('(els)=>els.map(e=>e.value)'))
 page.locator('.auth-box').screenshot(path=str(OUT/'workspace-activation.png'))
 browser.close()
server.shutdown()
(OUT/'SOURCES.md').write_text('''# Captures du portail Workspace

Source : squaredgroup/squared-workspace-web, commit c355aa6eaa3a3b4ad0d5da5bc47b50e1354fe852.

Formulaires réels exécutés localement, sans donnée personnelle et avec toutes les requêtes backend bloquées. Ces captures décrivent l’interface web, pas les applications natives, et ne confirment pas la santé du serveur.

Reproduction : WORKSPACE_SOURCE=/chemin/du/checkout python scripts/capture_workspace_guides.py
''')
print(json.dumps({'captured':['workspace-login.png','workspace-activation.png'],'backend':'blocked','source_commit':'c355aa6eaa3a3b4ad0d5da5bc47b50e1354fe852'}))
