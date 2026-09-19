"""Idempotent integration of the shared responsive assets; no generated page content."""
from pathlib import Path
import os
import re

ROOT = Path(__file__).resolve().parents[1]
changed = []
for page in sorted(ROOT.rglob('*.html')):
    if any(part in {'.git', 'node_modules', 'test-results'} for part in page.relative_to(ROOT).parts):
        continue
    original = text = page.read_text(encoding='utf-8')
    if 'assets/sidebar.css' not in text or '</head>' not in text or '</body>' not in text:
        continue
    css = Path(os.path.relpath(ROOT / 'assets/responsive.css', page.parent)).as_posix()
    js = Path(os.path.relpath(ROOT / 'assets/mobile-nav.js', page.parent)).as_posix()
    if 'data-sq-responsive' not in text:
        text = text.replace('</head>', f'<link rel="stylesheet" href="{css}?v=20260919.1" data-sq-responsive>\n</head>', 1)
    if 'data-sq-mobile-nav' not in text:
        text = text.replace('</body>', f'<script defer src="{js}?v=20260919.1" data-sq-mobile-nav></script>\n</body>', 1)
    if page.name == 'index.html' and page.parent == ROOT and '<div class="help-search"' in text:
        replacement = '''<button class="help-search" data-search-open type="button" aria-label="Rechercher dans le centre d’aide">
    <span class="search-icon" data-icon-key="search" aria-hidden="true"></span>
    <span class="help-search-label">Rechercher dans le centre d’aide…</span>
    <kbd aria-hidden="true">⌘K</kbd>
  </button>'''
        text, count = re.subn(r'<div class="help-search"[^>]*>.*?<kbd>⌘K</kbd>\s*</div>', replacement, text, count=1, flags=re.S)
        assert count == 1, 'The homepage search markup changed; inspect before editing.'
    if original != text:
        page.write_text(text, encoding='utf-8')
        changed.append(str(page.relative_to(ROOT)))
print(f'Responsive assets integrated into {len(changed)} pages.')
for name in changed:
    print(name)
