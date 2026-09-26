"""Optional read-only public evidence. No accounts, cookies, purchases or writes."""
from pathlib import Path
from urllib.request import Request, urlopen
import json
OUT=Path('/tmp/editorial-artifacts');OUT.mkdir(exist_ok=True,parents=True)
ENDPOINTS={
 'workspace-public-articles':'https://workspace.squaredgroup.studio/v1/public/web-content/docs/articles',
 'workspace-public-faqs':'https://workspace.squaredgroup.studio/v1/public/web-content/docs/faqs',
 'build-api-status':'https://build.squaredgroup.studio/api/status',
 'build-catalogue':'https://build.squaredgroup.studio/catalogue.json'
}
def main():
 for name,url in ENDPOINTS.items():
  try:
   with urlopen(Request(url,headers={'User-Agent':'SquaredEditorialAudit/1.0'}),timeout=15) as r:
    raw=r.read(3000000);data=json.loads(raw)
    (OUT/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2))
    if isinstance(data,list):summary={'count':len(data),'titles':[x.get('title') for x in data if isinstance(x,dict)]}
    elif isinstance(data,dict):summary={'keys':list(data),'items':len(data.get('items',[])),'courses':len(data.get('courses',[]))}
    else:summary={'type':type(data).__name__}
    print(name,r.status,json.dumps(summary,ensure_ascii=False))
  except Exception as exc: print(name,'not confirmed',type(exc).__name__,str(exc)[:160])
if __name__=='__main__':main()
