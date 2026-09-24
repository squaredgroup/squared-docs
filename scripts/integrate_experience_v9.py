"""Keep the shared visual layer last on public Help Center pages."""
from pathlib import Path
import os
import re

ROOT = Path(__file__).resolve().parents[1]
VERSION = '20260924.1'
changed = []

for page in sorted(ROOT.rglob('*.html')):
    if any(part in {'.git', 'node_modules', 'test-results', '.venv'} for part in page.relative_to(ROOT).parts):
        continue
    original = text = page.read_text(encoding='utf-8')
    if 'assets/sidebar.css' not in text or '</head>' not in text:
        continue
    href = Path(os.path.relpath(ROOT / 'assets/experience-v9.css', page.parent)).as_posix()
    style = f'<link rel="stylesheet" href="{href}?v={VERSION}" data-sq-experience-v9>'
    if 'data-sq-experience-v9' in text:
        text = re.sub(r'<link\b[^>]*data-sq-experience-v9[^>]*>', style, text, count=1)
    else:
        text = text.replace('</head>', style + '\n</head>', 1)
    if text != original:
        page.write_text(text, encoding='utf-8')
        changed.append(str(page.relative_to(ROOT)))

print(f'Experience v9 integrated into {len(changed)} pages.')
