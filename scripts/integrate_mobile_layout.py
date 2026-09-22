"""Idempotent mobile integration. Preserve editorial content and backend settings."""
from pathlib import Path
import os
import re

ROOT = Path(__file__).resolve().parents[1]
VERSION = '20260922.1'
changed = []
for page in sorted(ROOT.rglob('*.html')):
    if any(part in {'.git','node_modules','test-results','.venv'} for part in page.relative_to(ROOT).parts):
        continue
    original = text = page.read_text(encoding='utf-8')
    if 'assets/sidebar.css' not in text or '</head>' not in text or '</body>' not in text:
        continue
    asset = lambda name: Path(os.path.relpath(ROOT/'assets'/name,page.parent)).as_posix()
    if 'data-sq-responsive' not in text:
        text=text.replace('</head>',f'<link rel="stylesheet" href="{asset("responsive.css")}?v=20260919.1" data-sq-responsive>\n</head>',1)
    nav=f'<script defer src="{asset("mobile-nav.js")}?v={VERSION}" data-sq-mobile-nav></script>'
    if 'data-sq-mobile-nav' in text:
        text=re.sub(r'<script\b[^>]*\bdata-sq-mobile-nav\b[^>]*>\s*</script>',nav,text,count=1,flags=re.I)
    else:
        text=text.replace('</body>',nav+'\n</body>',1)
    css=f'<link rel="stylesheet" href="{asset("mobile-experience.css")}?v={VERSION}" data-sq-mobile-experience-style>'
    js=f'<script defer src="{asset("mobile-experience.js")}?v={VERSION}" data-sq-mobile-experience-script></script>'
    if 'data-sq-mobile-experience-style' in text:
        text=re.sub(r'<link\b[^>]*\bdata-sq-mobile-experience-style\b[^>]*>',css,text,count=1,flags=re.I)
    else:
        text=text.replace('</head>',css+'\n</head>',1)
    if 'data-sq-mobile-experience-script' in text:
        text=re.sub(r'<script\b[^>]*\bdata-sq-mobile-experience-script\b[^>]*>\s*</script>',js,text,count=1,flags=re.I)
    else:
        text=text.replace('</body>',js+'\n</body>',1)
    text=re.sub(r'<meta\b[^>]*name=[\"\']viewport[\"\'][^>]*>', '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',text,count=1,flags=re.I)
    if page.name=='index.html' and page.parent==ROOT:
        text=text.replace('Comment pouvons-nous<br>vous aider ?', 'Comment pouvons-nous<br> vous aider ?')
    if text!=original:
        page.write_text(text,encoding='utf-8');changed.append(str(page.relative_to(ROOT)))
print(f'Mobile assets integrated into {len(changed)} pages.')
for name in changed: print(name)
