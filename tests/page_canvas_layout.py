"""Isolated CSS/layout regression for the single page canvas.

Uses real HTML and linked repository styles, with scripts and external requests
removed. No backend calls, authentication, production writes or live-site claims.
Run: python tests/page_canvas_layout.py
Optional: CHROMIUM_EXECUTABLE=/usr/bin/chromium
"""
import base64
import json
import mimetypes
import os
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
PAGES = sorted(p for p in ROOT.glob('*.html') if 'data-sq-page-shell' in p.read_text())


class Tag(HTMLParser):
    def handle_starttag(self, name, attrs):
        self.attrs = dict(attrs)


def attrs(raw):
    parser = Tag()
    parser.feed(raw)
    return parser.attrs


def fixture(path):
    source = re.sub(r'<script\b[^>]*>.*?</script\s*>', '', path.read_text(), flags=re.I | re.S)

    def asset(href):
        parts = urlsplit(href)
        if parts.scheme or parts.netloc:
            return None
        value = (path.parent / unquote(parts.path)).resolve()
        return value if value.is_relative_to(ROOT) and value.is_file() else None

    def link(match):
        a = attrs(match.group())
        target = asset(a.get('href', ''))
        if 'stylesheet' in a.get('rel', '').split() and target:
            return '<style>' + target.read_text() + '</style>'
        return ''

    def image(match):
        a = attrs(match.group())
        target = asset(a.get('src', ''))
        if target:
            mime = mimetypes.guess_type(target.name)[0] or 'application/octet-stream'
            data = base64.b64encode(target.read_bytes()).decode()
            return re.sub(r'\bsrc=("[^"]*"|\x27[^\x27]*\x27)', 'src="data:' + mime + ';base64,' + data + '"', match.group())
        return match.group()

    source = re.sub(r'<link\b[^>]*>', link, source, flags=re.I)
    source = re.sub(r'<img\b[^>]*>', image, source, flags=re.I)
    # Freeze decorative animations for reproducible bounding boxes.
    return source.replace('</head>', '<style>*,*::before,*::after{animation:none!important;transition:none!important}</style></head>')


METRICS = """() => {
 const main = document.querySelector('.app > .main');
 const canvas = main?.querySelector(':scope > .shell, :scope > .forum-shell');
 if (!canvas) throw new Error('Missing direct page canvas');
 const box = e => {const c=getComputedStyle(e),r=e.getBoundingClientRect();return {
   x:r.x,right:r.right,y:r.y,width:r.width,
   padding:[c.paddingTop,c.paddingRight,c.paddingBottom,c.paddingLeft],
   margin:[c.marginTop,c.marginRight,c.marginBottom,c.marginLeft],
   background:c.backgroundColor,image:c.backgroundImage,
   border:[c.borderTopWidth,c.borderRightWidth,c.borderBottomWidth,c.borderLeftWidth],
   radius:c.borderTopLeftRadius,shadow:c.boxShadow
 }};
 const intro=canvas.querySelector(':scope > .help-hero, :scope > .sq-guides-hero');
 const search=intro?.querySelector('.help-search');
 const card=canvas.querySelector('.sq-hero-aside');
 return {main:box(main),canvas:box(canvas),intro:intro?box(intro):null,
   search:search?box(search):null,featured:card?box(card):null,
   guideCards:canvas.querySelectorAll('.sq-guide-card').length,
   scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth};
}"""


def run():
    assert {'index.html', 'guides.html'}.issubset({p.name for p in PAGES})
    results = []
    try:
        with sync_playwright() as pw:
            options = {'headless': True}
            if os.environ.get('CHROMIUM_EXECUTABLE'):
                options['executable_path'] = os.environ['CHROMIUM_EXECUTABLE']
            browser = pw.chromium.launch(**options)
            for width in (390, 768, 1440):
                context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
                context.route('**/*', lambda r: r.abort())
                page = context.new_page()
                for path in PAGES:
                    page.set_content(fixture(path), wait_until='load')
                    for theme in ('light', 'dark'):
                        page.evaluate('(theme) => document.documentElement.dataset.theme=theme', theme)
                        m = page.evaluate(METRICS)
                        key = (path.name, width, theme)
                        c = m['canvas']
                        assert c['padding'] == ['16px'] * 4, (key, 'padding', c)
                        assert c['margin'] == ['16px'] * 4, (key, 'margin', c)
                        assert abs(c['x'] - m['main']['x'] - 16) < 1, (key, 'left gutter', m)
                        assert abs(m['main']['right'] - c['right'] - 16) < 1, (key, 'right gutter', m)
                        assert c['border'] == ['1px'] * 4, (key, 'outer frame', c)
                        expected = 'rgb(247, 248, 246)' if theme == 'light' else 'rgb(21, 24, 21)'
                        assert c['background'] == expected, (key, 'canvas color', c)
                        if path.name in ('index.html', 'guides.html'):
                            intro = m['intro']
                            assert intro and intro['border'] == ['0px'] * 4, (key, 'double border', intro)
                            assert intro['padding'] == ['0px'] * 4, (key, 'double padding', intro)
                            assert intro['background'] == 'rgba(0, 0, 0, 0)' and intro['image'] == 'none', (key, 'double background', intro)
                            assert intro['shadow'] == 'none' and intro['radius'] == '0px', (key, 'double frame', intro)
                            assert abs(intro['x'] - c['x'] - 17) < 1, (key, 'intro alignment', m)
                            assert m['scrollWidth'] <= width + 1, (key, 'overflow', m)
                            if path.name == 'guides.html':
                                assert m['guideCards'] == 8, (key, 'guide cards retained', m)
                            if path.name == 'index.html':
                                assert m['featured']['border'] == ['1px'] * 4, (key, 'featured article retained', m)
                                if width <= 860:
                                    search = m['search']
                                    assert search['x'] >= intro['x'] - 1 and search['right'] <= intro['right'] + 1, (key, 'search overflows canvas', m)
                            if width in (390, 1440) and theme == 'light':
                                page.screenshot(path=str(OUT / f'canvas-{path.stem}-{width}.png'))
                        results.append({'page': path.name, 'width': width, 'theme': theme, 'passed': True})
                context.close()
            browser.close()
    finally:
        (OUT / 'page-canvas-layout.json').write_text(json.dumps({'scope': 'isolated HTML/CSS, no runtime or backend', 'checks': results, 'count': len(results)}, indent=2))
    print(json.dumps({'passed': True, 'pages': len(PAGES), 'checks': len(results)}))


if __name__ == '__main__':
    run()
