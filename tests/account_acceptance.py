"""Run the main suite, then verify account flows using the same isolated backend."""
import runpy,json,threading,functools
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
suite=runpy.run_path('tests/help_center_acceptance.py')
root,out=suite['ROOT'],suite['OUT']
mock=suite['MOCK'].replace('ROLE','"admin"').replace("username:'test'","username:'test',email:'qa@example.invalid'")
mock=mock.replace('signOut:async()=>({error:null})','updateUser:async()=>({error:{message:"Refus e-mail simulé"}}),signOut:async()=>({error:null})')
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(suite['QuietHandler'],directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
checks=[]
with sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page(viewport={'width':1280,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    def route(r):
        url=r.request.url
        if '@supabase/supabase-js' in url:return r.fulfill(content_type='application/javascript',body=mock)
        if '/assets/forum.js' in url or '/assets/react-ui.js' in url:return r.fulfill(content_type='application/javascript',body='export {};')
        if url.startswith(origin):return r.continue_()
        if '.supabase.co' in url:return r.fulfill(content_type='application/json',body='[]',headers={'Access-Control-Allow-Origin':'*'})
        return r.abort()
    page.route('**/*',route)
    page.goto(origin+'/account-settings.html')
    page.locator('#accountDisplayName').wait_for()
    page.locator('#accountEmail').fill('changed@example.invalid')
    page.locator('#accountProfileForm [type="submit"]').click()
    page.get_by_text('Profil enregistré, mais le changement d’e-mail a échoué',exact=False).wait_for()
    assert not page.locator('#accountAlert.success').count()
    assert page.locator('#exportHelpData').is_visible()
    assert page.locator('#revokeHelpSessions').is_visible()
    checks.append('Erreur de changement d’e-mail affichée, sans faux succès')
    checks.append('Export et révocation globale des sessions accessibles')
    page.goto(origin+'/notification-settings.html')
    email=page.locator('[data-pref="email_enabled"] .sq-switch')
    email.wait_for()
    assert email.is_disabled()
    assert email.get_attribute('aria-checked')=='false'
    checks.append('Canal e-mail non raccordé indiqué indisponible')
    assert not errors,errors
    page.screenshot(path=str(out/'notification-settings.png'),full_page=True)
    browser.close()
server.shutdown()
(out/'account-acceptance.json').write_text(json.dumps({'passed':True,'checks':checks,'backend':'isolated mock'},ensure_ascii=False,indent=2))
print(json.dumps({'passed':True,'checks':checks},ensure_ascii=False))
