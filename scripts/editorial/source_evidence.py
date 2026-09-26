"""Collect pinned public code evidence, without account access or product writes."""
from pathlib import Path
from urllib.request import Request,urlopen
from zipfile import ZipFile,ZIP_DEFLATED
from io import BytesIO
import json,runpy
OUT=Path('/tmp/editorial-artifacts');OUT.mkdir(parents=True,exist_ok=True)
ROOT=Path(__file__).resolve().parents[2]
meta=json.loads((ROOT/'content/editorial-provenance.json').read_text())
sha=meta['workspace_source_commit']
def get(url):
 with urlopen(Request(url,headers={'User-Agent':'SquaredEditorialAudit/1.0'}),timeout=30) as r:return r.read(12000000)
raw=get('https://codeload.github.com/squaredgroup/squared-workspace-web/zip/'+sha)
with ZipFile(BytesIO(raw)) as source,ZipFile(OUT/'workspace-source.zip','w',ZIP_DEFLATED) as dest:
 for info in source.infolist():
  name='/'.join(info.filename.split('/')[1:])
  if name and not info.is_dir() and Path(name).suffix in {'.js','.html','.json','.md','.css','.py'}:dest.writestr(name,source.read(info))
(OUT/'product-source.json').write_text(json.dumps({'workspace_commit':sha,'scope':'pinned public code, not an authenticated backend test'},indent=2))
print('Workspace pinned public code',sha)
checker=Path(__file__).with_name('check_public_sources.py')
if checker.exists():runpy.run_path(str(checker),run_name='__main__')
