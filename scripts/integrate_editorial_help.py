from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
for path in ROOT.rglob("*.html"):
    if any(p in {".git","node_modules","test-results"} for p in path.parts):
        continue
    text=path.read_text()
    text=text.replace("refinement.css?v=20260919.3","refinement.css?v=20260919.4")
    text=text.replace("assistance.css?v=20260919.3","assistance.css?v=20260919.4")
    text=text.replace("refinement.js?v=20260919.1","refinement.js?v=20260919.2")
    text=text.replace("assistance.js?v=20260919.2","assistance.js?v=20260919.3")
    text=re.sub(r'(<a href="(?:\.\./)?index\.html">)Help Center(</a>)',r"\1Centre d’aide\2",text)
    text=text.replace("© 2026 Squared Group · Help Center","© 2026 Squared Group · Centre d’aide")
    path.write_text(text)
print("Editorial integration applied")
