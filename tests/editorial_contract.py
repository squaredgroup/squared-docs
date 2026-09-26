"""Read-only, deterministic editorial contracts. No network or real user data."""
from pathlib import Path
from urllib.parse import urlsplit,unquote
from bs4 import BeautifulSoup
import hashlib,json,subprocess,sys,re
ROOT=Path(__file__).resolve().parents[1]
MANIFEST=json.loads((ROOT/'content/editorial-manifest.json').read_text())
BASE=json.loads((ROOT/'content/editorial-baseline.json').read_text())
INDEX=json.loads((ROOT/'assets/knowledge-index.json').read_text())
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
checks=[];issues=[]
cache={}
def soup(path):
 if path not in cache:cache[path]=BeautifulSoup(path.read_text(),'html.parser')
 return cache[path]
def check(value,label):
 if not value:issues.append(label)
def local_target(source,link):
 u=urlsplit(link)
 if u.scheme or u.netloc:return None
 return (source.parent/unquote(u.path)).resolve() if u.path else source
paths=MANIFEST['generated_paths']
for name in paths:
 p=ROOT/name;s=soup(p)
 check(len(s.select('h1'))==1,name+': exactly one h1')
 ids=[x.get('id') for x in s.select('[id]')]
 check(len(ids)==len(set(ids)),name+': unique ids')
 check(s.select_one('meta[name=viewport]') is not None,name+': viewport')
 check(len(s.select('aside#sidebar'))==1,name+': a single global sidebar')
 check(s.select_one('link[data-sq-editorial-members]') is not None,name+': editorial style')
 if name in MANIFEST['article_paths']:
  a=s.select_one('[data-editorial-version]')
  check(a is not None,name+': editorial provenance')
  check(len(a.select('section.doc-block'))>=4,name+': structured article')
  text=a.get_text(' ',strip=True)
  check(not re.search(r'\b(TODO|TBD|lorem ipsum|à compléter)\b',text,re.I),name+': no published placeholder')
  check(not a.select('script,iframe'),name+': inert editorial body')
 for a in s.select('a[href]'):
  link=a['href'];u=urlsplit(link)
  if u.scheme and u.scheme not in ('http','https','mailto'):issues.append(name+': unsafe scheme '+link);continue
  target=local_target(p,link)
  if target is None:continue
  check(target.is_relative_to(ROOT),name+': link leaves site '+link)
  if not target.is_relative_to(ROOT):continue
  check(target.exists(),name+': broken destination '+link)
  if target.is_file() and target.suffix=='.html' and u.fragment:
   # Legacy service dialogs can provide runtime anchors; authored links require real targets.
   if name in MANIFEST['article_paths'] or name in ('guides.html','parcours.html'):
    check(soup(target).find(id=unquote(u.fragment)) is not None,name+': broken anchor '+link)
 for el in s.select('script[src],link[rel=stylesheet][href],img[src]'):
  link=el.get('src') or el.get('href');target=local_target(p,link)
  if target is not None:check(target.exists(),name+': missing resource '+link)
checks.append('All generated pages: headings, anchors, links, resources, no placeholder and one sidebar')
for row in BASE:check((ROOT/row['path']).exists(),'Legacy path removed: '+row['path'])
checks.append('All legacy HTML addresses preserved')
indexed=[r['href'] for r in INDEX]
check(len(indexed)==len(set(indexed)),'Duplicate search URL')
for name in paths:check(name in indexed,'Missing search page '+name)
chapter_rows=[r for r in INDEX if re.search(r'wix-studio.html#chapitre-',r['href'])]
check(len(chapter_rows)==29,'Wix chapters missing from index: '+str(len(chapter_rows)))
checks.append('Search updated; canonical URLs unique; 29 Wix chapters preserved')
for key,journey in MANIFEST['journeys'].items():
 check(len(journey)>=5,'Incomplete journey '+key)
 section=soup(ROOT/'parcours.html').find(id=key)
 check(section is not None,'Missing static journey '+key)
 for path in journey:check(section.find('a',href=path) is not None,key+': missing journey step '+path)
check(len(soup(ROOT/'faq.html').select('.faq-item'))==16,'FAQ contract')
check(len(MANIFEST['initial12'])==12,'Initial needs count')
for item in MANIFEST['initial12']:check((ROOT/urlsplit(item['canonical']).path).exists(),'Initial need missing '+item['need'])
checks.append('Four static journeys, 12 initial needs and 16 FAQ answers')
# Validate optional archived product source evidence without claiming live server tests.
evidence=Path('/tmp/editorial-artifacts')
if (evidence/'workspace-source.zip').exists():
 from zipfile import ZipFile
 with ZipFile(evidence/'workspace-source.zip') as z:
  src=z.read('js/focus-records.js').decode()
  for label in ['Nouvelle tâche','Enregistrer','Valider cet élément','Demander une modification','Ajouter un fichier','Téléverser']:
   check(label in src,'UI label absent from collected Workspace source: '+label)
 checks.append('Key Workspace command labels found in collected public code')
for f in ['sidebar.js','assistance.js','editorial-intelligence.js','help-core.js']:
 subprocess.run(['node','--check',str(ROOT/'assets'/f)],check=True)
checks.append('Modified JavaScript parses')
# Build twice: the same sources must not produce a different site.
def hashes():
 selection=[ROOT/n for n in paths]+[ROOT/'assets/knowledge-index.json',ROOT/'content/editorial-register.json',ROOT/'content/editorial-manifest.json',ROOT/'sitemap.xml']
 return {p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in selection}
before=hashes();subprocess.run([sys.executable,str(ROOT/'scripts/editorial/build.py')],check=True);after=hashes()
check(before==after,'Build is not idempotent: '+','.join(k for k in before if before[k]!=after[k]))
checks.append('Editorial build is idempotent')
report={'scope':'Structure, content, source labels when available and offline build; no live account or purchase','passed':not issues,'checks':checks,'errors':issues,'generated_pages':len(paths),'article_count':MANIFEST['authored_articles']}
(OUT/'editorial-contract.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
if issues:raise SystemExit(1)
