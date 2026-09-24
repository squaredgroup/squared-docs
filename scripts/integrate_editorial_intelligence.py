"""Integrate the editorial intelligence layer on public documentation pages."""
from pathlib import Path
import os,re
ROOT=Path(__file__).resolve().parents[1]
VERSION='20260924.2'
changed=[]
for page in sorted(ROOT.rglob('*.html')):
    if any(x in {'.git','node_modules','test-results'} for x in page.relative_to(ROOT).parts):
        continue
    text=original=page.read_text(encoding='utf-8')
    if 'assets/sidebar.css' not in text or '</head>' not in text or '</body>' not in text:
        continue
    css=Path(os.path.relpath(ROOT/'assets/editorial-intelligence.css',page.parent)).as_posix()
    js=Path(os.path.relpath(ROOT/'assets/editorial-intelligence.js',page.parent)).as_posix()
    style=f'<link rel="stylesheet" href="{css}?v={VERSION}" data-sq-editorial-intelligence-style>'
    script=f'<script defer src="{js}?v={VERSION}" data-sq-editorial-intelligence-script></script>'
    if 'data-sq-editorial-intelligence-style' not in text:
        text=text.replace('</head>',style+'\n</head>',1)
    else:
        text=re.sub(r'<link\b[^>]*data-sq-editorial-intelligence-style[^>]*>',style,text,count=1)
    if 'data-sq-editorial-intelligence-script' not in text:
        text=text.replace('</body>',script+'\n</body>',1)
    else:
        text=re.sub(r'<script\b[^>]*data-sq-editorial-intelligence-script[^>]*>\s*</script>',script,text,count=1)
    if text!=original:
        page.write_text(text,encoding='utf-8')
        changed.append(str(page.relative_to(ROOT)))
print(f'Editorial intelligence integrated into {len(changed)} pages.')
