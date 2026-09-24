"""Load the current Help Center design after the existing shared styles."""
from pathlib import Path
import os
import re

ROOT = Path(__file__).resolve().parents[1]
VERSION = '20260924.2'
changed = []

for page in sorted(ROOT.rglob('*.html')):
    if any(part in {'.git', 'node_modules', 'test-results', '.venv'} for part in page.relative_to(ROOT).parts):
        continue
    original = text = page.read_text(encoding='utf-8')
    if 'assets/sidebar.css' not in text or '</head>' not in text:
        continue
    href = Path(os.path.relpath(ROOT / 'assets/experience-v10.css', page.parent)).as_posix()
    style = f'<link rel="stylesheet" href="{href}?v={VERSION}" data-sq-experience-v10>'
    if 'data-sq-experience-v10' in text:
        text = re.sub(r'<link\b[^>]*data-sq-experience-v10[^>]*>', style, text, count=1)
    else:
        text = text.replace('</head>', style + '\n</head>', 1)
    text = re.sub(r'(<script\s+src="[^"]*assets/docs\.js)(?:\?v=[^"]*)?("[^>]*></script>)',
                  lambda match: f'{match.group(1)}?v=20260924.3{match.group(2)}', text)
    if text != original:
        page.write_text(text, encoding='utf-8')
        changed.append(str(page.relative_to(ROOT)))

print(f'Experience v10 integrated into {len(changed)} pages.')
