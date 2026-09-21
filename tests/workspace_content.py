from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
client = (ROOT / "assets/workspace-content.js").read_text()
styles = (ROOT / "assets/workspace-content.css").read_text()
core = (ROOT / "assets/help-core.js").read_text()

assert "https://workspace.squaredgroup.studio/v1/public/web-content/docs" in client
for collection in ("articles", "categories", "faqs", "navigation", "releases"):
    assert f'"{collection}"' in client
assert "textContent" in client
assert "insertAdjacentHTML" not in client
assert "innerHTML" not in client
assert '["http:", "https:"]' in client
assert "workspace-content.js" not in core
for page_name in ("index.html", "article.html", "faq.html", "changelog.html"):
    page = (ROOT / page_name).read_text()
    assert "workspace-content.js?v=20260921.1" in page
    assert "workspace-content.css?v=20260921.1" in page
assert ".sq-managed-grid" in styles
assert "prefers-reduced-motion" in styles
print("Workspace content integration OK")
