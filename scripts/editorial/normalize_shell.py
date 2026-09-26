"""Preserve the public shell's responsive CSS precedence after legacy generators.
Moves only a misplaced assistance stylesheet; never changes article text or CSS rules.
"""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[2]
SKIP={'.git','.reference','node_modules','test-results'}
ASSISTANCE=re.compile(r'<link\b[^>]*\bdata-sq-assistance-style(?=[\s=>])[^>]*>',re.I)
RESPONSIVE=re.compile(r'<link\b[^>]*\bdata-sq-responsive(?=[\s=>])[^>]*>',re.I)

def normalize(text):
    a=list(ASSISTANCE.finditer(text));r=list(RESPONSIVE.finditer(text))
    if not a and not r:return text
    if len(a)!=1 or len(r)!=1:raise ValueError('Expected one assistance and one responsive stylesheet')
    if a[0].start()<r[0].start():return text
    tag=a[0].group();text=text[:a[0].start()]+text[a[0].end():]
    pos=RESPONSIVE.search(text).start()
    return text[:pos]+tag+'\n'+text[pos:]

def main():
    example='<head><link href="r.css" data-sq-responsive><link href="a.css" data-sq-assistance-style><link href="x.css"></head>'
    result=normalize(example)
    assert result.count('<link')==3 and result.index('a.css')<result.index('r.css')<result.index('x.css')
    assert normalize(result)==result
    checked=[];changed=[]
    for p in sorted(ROOT.rglob('*.html')):
        if SKIP.intersection(p.relative_to(ROOT).parts):continue
        original=p.read_text()
        if 'assets/sidebar.css' not in original:continue
        updated=normalize(original)
        if updated!=original:p.write_text(updated);changed.append(p.relative_to(ROOT).as_posix())
        a=ASSISTANCE.search(updated);r=RESPONSIVE.search(updated)
        assert a and r and a.start()<r.start(),p
        checked.append(p.relative_to(ROOT).as_posix())
    out=ROOT/'test-results';out.mkdir(exist_ok=True)
    (out/'editorial-shell.json').write_text(json.dumps({'passed':True,'checked':len(checked),'normalized':changed,'scope':'stylesheet order only; no article or CSS rule changes'},ensure_ascii=False,indent=2))
    print(json.dumps({'shell_checked':len(checked),'normalized':changed}))

if __name__=='__main__':main()
