"""Verify deployed public HTML; no authentication or product mutation."""
from pathlib import Path
from urllib.request import Request,urlopen
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timezone
import json,time,re
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
manifest=json.loads((ROOT/'content/editorial-manifest.json').read_text())
base='https://docs.squaredgroup.studio/'
marker=manifest['release']
def read(path):
 req=Request(base+path+'?editorial='+marker,headers={'User-Agent':'SquaredEditorialVerification/1.0','Cache-Control':'no-cache'})
 with urlopen(req,timeout=25) as r:return r.status,r.read(3000000).decode('utf-8')
ready=False
for attempt in range(18):
 try:
  code,text=read('guide-build-carnet.html')
  if code==200 and marker in text:ready=True;break
 except Exception:pass
 time.sleep(10)
def verify(path):
 expected=BeautifulSoup((ROOT/path).read_text(),'html.parser')
 try:
  code,text=read(path);actual=BeautifulSoup(text,'html.parser')
  h1=actual.find('h1');want=expected.find('h1')
  same_title=h1 is not None and want is not None and h1.get_text(' ',strip=True)==want.get_text(' ',strip=True)
  ea=expected.select_one('article[data-editorial-version]');aa=actual.select_one('article[data-editorial-version]')
  content_equal=(aa is not None and aa.get_text(' ',strip=True)==ea.get_text(' ',strip=True)) if ea else all(a.get('href') in {x.get('href') for x in actual.select('a[href]')} for a in expected.select('[data-editorial-home] a[href],#journeyMount a[href]'))
  if path=='changelog.html':
   wanted=expected.select_one('[data-editorial-release]');present=actual.select_one('[data-editorial-release]')
   content_equal=bool(wanted and present and wanted.get_text(' ',strip=True)==present.get_text(' ',strip=True))
  return {'path':path,'http':code,'same_title':same_title,'content_matches':content_equal,'passed':code==200 and same_title and content_equal}
 except Exception as exc:return {'path':path,'passed':False,'error':type(exc).__name__+': '+str(exc)[:180]}
rows=[]
if ready:
 with ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(verify,manifest['generated_paths']+['changelog.html']))
report={'checked_at':datetime.now(timezone.utc).isoformat(),'base':base,'scope':'Public deployed HTML only. No account, payment, native application or authenticated workflow tested.','deployment_ready':ready,'checked_pages':len(rows),'passed':ready and all(x['passed'] for x in rows),'pages':rows}
(OUT/'editorial-public.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'ready':ready,'checked':len(rows),'passed':report['passed'],'failed':[r for r in rows if not r['passed']]},ensure_ascii=False,indent=2))
if not report['passed']:raise SystemExit(1)
