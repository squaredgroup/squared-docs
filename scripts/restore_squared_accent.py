"""Restore Squared's approved accent. Idempotent; no layout or backend changes."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / 'assets/refinement.css'
ACCENT = '#7BE84E'
STAMP = '20260919.3'
text = CSS.read_text()
for token in ('--green', '--green-2', '--sq-accent'):
    text = re.sub(re.escape(token) + r':#[0-9a-fA-F]{3,8}(?=[;}])', token + ':' + ACCENT, text)
text = text.replace('rgba(49,108,34,.2)', 'rgba(123,232,78,.28)')
text = text.replace('--green-soft:#eaf5e4', '--green-soft:#effcea')
text = text.replace('--green-soft:#253220', '--green-soft:#23301f')
text = text.replace('background:#a2f47e;border-color:#a2f47e;color:#16300d',
                    'background:var(--sq-accent);border-color:var(--sq-accent);color:#16300d;box-shadow:inset 0 0 0 1px #16300d')
if '--sq-accent-ink:' not in text:
    text = text.replace('--orange:#875a12', '--sq-accent-ink:#171c16;--orange:#875a12', 1)
    text = text.replace('--orange:#edc17b', '--sq-accent-ink:#7BE84E;--orange:#edc17b', 1)
# Brand green must not be darkened to supply contrast for small text on white.
# Keep the accent exact; use a separate neutral ink for those labels instead.
ink_rules = '''
/* Official Squared accent: #7BE84E in both themes. Never darken the brand token.
   Ink is separate so small labels remain readable on light surfaces. */
body .main .category-card .cat-link{color:var(--sq-accent-ink)!important;text-decoration:underline;text-decoration-color:var(--sq-accent);text-underline-offset:4px}
body :is(.doc-block a,.article a:not(.btn),.role-label,.role-links a,.badge.green,.pill.live,.status.live,.forum-alert.success,.home-status-row em,.filter-chip.active,.search-result em,.universal-result em,.sq-task-card small,.sq-guide-link,.sq-text-link){color:var(--sq-accent-ink)}
body :is(.doc-block a,.sq-guide-link,.sq-text-link){text-decoration:underline;text-decoration-color:var(--sq-accent);text-underline-offset:4px}
body .server-badge.ok{color:var(--sq-accent-ink);border-color:var(--sq-accent);background:var(--green-soft)}
html[data-theme="light"] body :is(button,a,input,select,textarea):focus-visible{outline-color:var(--text);box-shadow:var(--ring)}
'''
if 'Official Squared accent:' not in text:
    text += '\n' + ink_rules
CSS.write_text(text)
# assistance.css follows refinement.css: update its textual uses, not icon colors.
p = ROOT / 'assets/assistance.css'
s = p.read_text()
for selector in ('.sq-task-card small', '.sq-guide-link', '.sq-text-link', '.search-result em,.universal-result em'):
    pattern = re.compile(re.escape(selector) + r'\{([^}]*)\}')
    s = pattern.sub(lambda m: selector + '{' + m.group(1).replace('color:var(--green)', 'color:var(--sq-accent-ink)') + '}', s)
p.write_text(s)
# Refresh stylesheet URLs for every existing page and loader without changing order.
count = 0
for p in list(ROOT.rglob('*.html')) + list((ROOT / 'assets').glob('*.js')) + list((ROOT / 'scripts').glob('*.py')):
    if p == Path(__file__).resolve() or any(x in p.parts for x in ('.git','node_modules','.reference','test-results')):
        continue
    old = p.read_text()
    new = re.sub(r'(assets/(?:refinement|assistance)\.css\?v=)\d{8}\.\d+', lambda m: m.group(1) + STAMP, old)
    if new != old:
        p.write_text(new)
        count += 1
# Preserve the existing text-contrast regression with the dedicated ink token.
# Exact brand-color assertions are handled separately by tests/brand_accent.py.
p = ROOT / 'tests/visual_refinement.py'
s = p.read_text().replace("'--green'", "'--sq-accent-ink'")
p.write_text(s)
assert '--green:#316c22' not in text and '--green:#a6ed89' not in text
assert text.count('--green:#7BE84E') == 2
assert 'background:#a2f47e' not in text
print(f'Restored accent {ACCENT}; refreshed CSS references in {count} files. No layout, role or data mutation.')
