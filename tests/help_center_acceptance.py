"""Browser tests with an isolated mock backend. No production mutations or real accounts."""
import json
import threading
import functools
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
USER = '11111111-1111-4111-8111-111111111111'
DOC = '22222222-2222-4222-8222-222222222222'
MOCK = r'''
const user={id:'11111111-1111-4111-8111-111111111111',display_name:'Équipe de test',username:'test',role:ROLE,is_banned:false};
const managed={id:'22222222-2222-4222-8222-222222222222',title:'Guide de test',description:'Exemple réservé aux tests automatisés.',product:'Help Center',kind:'guide',source_kind:'managed',status:'published',revision:1,href:'article.html?id=22222222-2222-4222-8222-222222222222',content_markdown:'# Première étape\nContenu documenté.\n<img src=x onerror=alert(1)>',next_review_at:'2030-01-01T00:00:00Z',last_reviewed_at:'2026-09-19T00:00:00Z'};
const fixtures={profiles:[user],knowledge_documents:[managed],forum_categories:[],forum_topics:[],forum_replies:[],forum_reports:[],support_tickets:[],support_macros:[{id:'macro-1',name:'Accueil',body:'Merci pour votre demande.',is_active:true}],service_components:[{id:'service-1',name:'Application native',product:'Workspace',monitor_type:'manual',current_status:'unknown',enabled:true,public:true}],incidents:[],maintenance_windows:[],doc_feedback:[],notifications:[],help_events:[],document_revisions:[]};
function query(name,args={}){
 let one=false,head=false,filter=null;
 const q={};
 for(const m of ['select','eq','is','neq','gte','lte','order','limit','not','in','range','insert','update','delete','upsert','abortSignal'])q[m]=(...a)=>{if(m==='select')head=a[1]?.head||false;if(m==='eq'&&a[0]==='id')filter=a[1];return q;};
 q.single=q.maybeSingle=()=>{one=true;return q;};
 q.then=(resolve,reject)=>{
 let data=fixtures[name]||[],error=null;
 if(name==='help_center_metrics')data={usage:{views:0,searches:0,zero_results:0},feedback:{total:0,helpful:0,negative:0},support:{active:0,created:0,awaiting_user:0,first_response_hours:null,resolution_hours:null,satisfaction:null},community:{topics:0},queries:[],review_due:0};
 if(name==='search_help_center')data=[{kind:'knowledge',title:'Résultat '+args.p_query,description:'Test',category:'Help Center',href:'index.html'}];
 if(name==='save_help_document')data={id:managed.id,revision:2,href:managed.href,status:args.p_status};
 if(Array.isArray(data)&&filter)data=data.filter(x=>x.id===filter);
 if(one&&Array.isArray(data))data=data[0]||null;
 const count=Array.isArray(data)?data.length:data?1:0;
 return new Promise(r=>setTimeout(()=>r({data:head?null:data,error,count}),args.p_query==='lente'?650:5)).then(resolve,reject);
 };
 return q;
}
export function createClient(){return {from:n=>query(n),rpc:(n,args)=>query(n,args),auth:{getSession:async()=>({data:{session:ROLE==='anon'?null:{user,access_token:'TEST_ONLY'}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null})},channel:()=>({on(){return this},subscribe(){return this}}),removeChannel:async()=>{},storage:{from:()=>({})}};}
'''

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'
checks=[]

with sync_playwright() as p:
    browser=p.chromium.launch()
    def page_for(role='admin', width=1280):
        context=browser.new_context(viewport={'width':width,'height':900})
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def route(r):
            url=r.request.url
            if '@supabase/supabase-js' in url:
                return r.fulfill(content_type='application/javascript',body=MOCK.replace('ROLE',json.dumps(role)))
            # Tests cover production admin/editor/search modules; unrelated realtime and React islands are isolated.
            if '/assets/forum.js' in url or '/assets/react-ui.js' in url:
                return r.fulfill(content_type='application/javascript',body='export {};')
            if url.startswith(origin): return r.continue_()
            if '.supabase.co' in url:
                return r.fulfill(content_type='application/json',body='[]',headers={'Access-Control-Allow-Origin':'*'})
            return r.abort()
        page.route('**/*',route)
        return page,context,errors

    page,context,errors=page_for()
    page.goto(origin+'/admin.html')
    page.locator('#adminApp').wait_for(state='visible')
    for tab in ['knowledge','support','community','status','analytics','overview']:
        page.locator('[data-admin-tab="'+tab+'"]').click()
        page.locator('[data-admin-panel="'+tab+'"][aria-busy="false"]').wait_for()
        assert not page.locator('[data-admin-panel="'+tab+'"] .forum-alert.error:visible').count(),tab
    page.locator('[data-admin-tab="analytics"]').click()
    page.locator('[data-admin-panel="analytics"][aria-busy="false"]').wait_for()
    assert '100%' not in page.locator('#analyticsMetrics').inner_text()
    assert 'aucun retour' in page.locator('#analyticsMetrics').inner_text().lower()
    page.screenshot(path=str(OUT/'admin.png'),full_page=True)
    assert not errors,errors
    checks.append('Console admin : six onglets et absence de faux 100 %')
    context.close()

    page,context,errors=page_for('member')
    page.goto(origin+'/admin.html')
    page.get_by_text('Accès refusé',exact=True).wait_for()
    assert not page.locator('#adminApp').is_visible()
    assert not errors,errors
    checks.append('Accès admin refusé à un membre ordinaire')
    context.close()

    page,context,errors=page_for()
    page.goto(origin+'/editorial.html')
    page.locator('#edTitle').wait_for()
    page.locator('#edTitle').fill('Mon nouveau guide')
    page.locator('#edBody').fill('# Test\n<img src=x onerror=alert(1)>\n[Dangereux](javascript:alert)')
    assert not page.locator('#managedPreview img').count()
    assert not page.locator('#managedPreview a[href^="javascript:"]').count()
    page.screenshot(path=str(OUT/'editor.png'),full_page=True)
    assert not errors,errors
    checks.append('Éditeur : aperçu et contenu HTML inerte')
    context.close()

    page,context,errors=page_for(width=390)
    page.goto(origin+'/article.html?id='+DOC)
    page.get_by_role('heading',name='Guide de test',exact=True).wait_for()
    assert not page.locator('#managedArticle img').count()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), 'Débordement mobile'
    page.screenshot(path=str(OUT/'article-mobile.png'),full_page=True)
    assert not errors,errors
    checks.append('Article publié : lecture mobile et aucune exécution HTML')
    context.close()

    page,context,errors=page_for()
    page.goto(origin+'/search.html')
    page.locator('#universalSearchInput').fill('lente')
    page.wait_for_timeout(280)
    page.locator('#universalSearchInput').fill('rapide')
    page.get_by_text('Résultat rapide',exact=True).wait_for()
    page.wait_for_timeout(700)
    assert not page.get_by_text('Résultat lente',exact=True).count()
    page.locator('#universalSearchInput').focus()
    page.keyboard.press('ArrowDown')
    assert page.evaluate('document.activeElement.matches(".universal-result")')
    assert not errors,errors
    checks.append('Recherche : ordre des réponses et accès clavier')
    context.close()
    browser.close()

server.shutdown()
(OUT/'acceptance.json').write_text(json.dumps({'passed':True,'checks':checks,'backend':'isolated mock; production data not modified'},ensure_ascii=False,indent=2))
print(json.dumps({'passed':True,'checks':checks},ensure_ascii=False))
