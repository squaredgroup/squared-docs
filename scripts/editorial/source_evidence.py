"""Read public product sources without signing in or mutating product data."""
from pathlib import Path
from urllib.request import Request, urlopen
from zipfile import ZipFile, ZIP_DEFLATED
from io import BytesIO
import json

OUT = Path('/tmp/editorial-artifacts')
OUT.mkdir(exist_ok=True, parents=True)
def get(url):
    with urlopen(Request(url, headers={'User-Agent': 'SquaredEditorialAudit/1.0'}), timeout=30) as r:
        return r.read()

meta = json.loads(get('https://api.github.com/repos/squaredgroup/squared-workspace-web/commits/main'))
sha = meta['sha']
raw = get('https://codeload.github.com/squaredgroup/squared-workspace-web/zip/' + sha)
with ZipFile(BytesIO(raw)) as src, ZipFile(OUT / 'workspace-source.zip', 'w', ZIP_DEFLATED) as dst:
    for info in src.infolist():
        relative = '/'.join(info.filename.split('/')[1:])
        if relative and not info.is_dir() and Path(relative).suffix in {'.js', '.html', '.json', '.md', '.css', '.py'}:
            dst.writestr(relative, src.read(info))
(OUT / 'product-source.json').write_text(json.dumps({'workspace_commit': sha, 'scope': 'public code, not an authenticated backend test'}, indent=2))
print('WORKSPACE SOURCE COMMIT', sha)
try:
    (OUT / 'build-platform.js').write_bytes(get('https://build.squaredgroup.studio/platform.js'))
    print('BUILD PUBLIC SCRIPT retrieved; no purchase or authentication performed')
except Exception as exc:
    print('BUILD SCRIPT UNCONFIRMED', type(exc).__name__)
