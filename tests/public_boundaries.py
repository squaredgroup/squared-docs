"""Read-only requests with the site's publishable key. Never creates an account or content."""
import json,re,urllib.request,urllib.error
from pathlib import Path
root=Path(__file__).resolve().parents[1]
config=(root/'assets/supabase-config.js').read_text()
base=re.search(r'SUPABASE_URL\s*=\s*[\"\']([^\"\']+)',config).group(1)
key=re.search(r'SUPABASE_PUBLISHABLE_KEY\s*=\s*[\"\']([^\"\']+)',config).group(1)
def get(path):
    req=urllib.request.Request(base+path,headers={'apikey':key,'Accept':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=15) as r:return r.status,json.load(r)
    except urllib.error.HTTPError as e:
        return e.code,None
checks=[]
code,rows=get('/rest/v1/knowledge_documents?select=id&status=eq.published&limit=1')
assert code==200 and isinstance(rows,list),'Public documentation endpoint unavailable'
checks.append('Les articles publiés sont consultables')
code,rows=get('/rest/v1/knowledge_documents?select=id&status=eq.draft&limit=1')
assert code==200 and rows==[],'A draft was exposed to the anonymous reader'
checks.append('Les brouillons ne sont pas exposés')
for resource in ['support_tickets','document_revisions','operations_audit']:
    code,rows=get('/rest/v1/'+resource+'?select=id&limit=1')
    assert code in (401,403) or (code==200 and rows==[]),'Unexpected anonymous visibility for '+resource
    checks.append(resource+': aucune donnée exposée au lecteur anonyme')
code,rows=get('/rest/v1/rpc/help_center_metrics?p_days=30')
assert code in (401,403),'The metrics RPC did not reject an anonymous reader'
checks.append('Les métriques internes refusent le lecteur anonyme')
(root/'test-results').mkdir(exist_ok=True)
(root/'test-results/public-boundaries.json').write_text(json.dumps({'passed':True,'mode':'read-only public API','checks':checks},ensure_ascii=False,indent=2))
print(json.dumps({'passed':True,'checks':checks},ensure_ascii=False))
