from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
for p in ROOT.rglob("*.html"):
    if any(x in {".git","node_modules","test-results"} for x in p.parts): continue
    s=p.read_text()
    s=s.replace("assets/refinement.css?v=20260919.3","assets/refinement.css?v=20260920.1")
    s=s.replace("../assets/refinement.css?v=20260919.3","../assets/refinement.css?v=20260920.1")
    s=s.replace("assets/assistance.css?v=20260919.3","assets/assistance.css?v=20260920.1")
    s=s.replace("../assets/assistance.css?v=20260919.3","../assets/assistance.css?v=20260920.1")
    s=s.replace("assets/refinement.js?v=20260919.1","assets/refinement.js?v=20260920.1")
    s=s.replace("../assets/refinement.js?v=20260919.1","../assets/refinement.js?v=20260920.1")
    s=s.replace("assets/assistance.js?v=20260919.2","assets/assistance.js?v=20260920.1")
    s=s.replace("../assets/assistance.js?v=20260919.2","../assets/assistance.js?v=20260920.1")
    p.write_text(s)
