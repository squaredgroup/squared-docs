import contextlib
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]

FIXTURES = {
    "articles": [{"id": "article-1", "data": {"title": "Activer Workspace", "slug": "activer-workspace", "summary": "Un guide publié depuis Workspace.", "body": "## Première étape\nOuvrez votre invitation.\n\n- Installez l’application\n- Activez votre accès", "category": "Démarrage", "featured": True, "status": "PUBLISHED"}}],
    "categories": [],
    "faqs": [{"id": "faq-1", "data": {"title": "Puis-je utiliser mon Mac ?", "question": "Puis-je utiliser mon Mac ?", "slug": "utiliser-mac", "body": "Oui, votre espace est disponible sur Mac.", "status": "PUBLISHED"}}],
    "navigation": [],
    "releases": [{"id": "release-1", "data": {"title": "Help Center synchronisé", "slug": "help-center-synchronise", "summary": "Les contenus proviennent maintenant de Workspace.", "version": "7.2", "status": "PUBLISHED"}}],
}


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@contextlib.contextmanager
def server():
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=ROOT, **kwargs)
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{httpd.server_port}"
    finally:
        httpd.shutdown()


def feed(route):
    collection = route.request.url.rsplit("/", 1)[-1]
    route.fulfill(status=200, content_type="application/json", body=json.dumps({"siteKey": "docs", "collectionKey": collection, "items": FIXTURES.get(collection, [])}), headers={"Access-Control-Allow-Origin": "*"})


with server() as base, sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.route("**/v1/public/web-content/docs/**", feed)
    page.route("**/*.supabase.co/**", lambda route: route.fulfill(status=200, content_type="application/json", body="[]", headers={"Access-Control-Allow-Origin": "*"}))

    page.goto(f"{base}/index.html", wait_until="domcontentloaded")
    page.locator("#workspaceContentTitle").wait_for()
    assert page.locator(".sq-managed-card", has_text="Activer Workspace").count() == 1

    page.goto(f"{base}/faq.html", wait_until="domcontentloaded")
    page.locator(".sq-managed-faq", has_text="Puis-je utiliser mon Mac ?").wait_for()

    page.goto(f"{base}/changelog.html", wait_until="domcontentloaded")
    page.locator(".sq-managed-update", has_text="Help Center synchronisé").wait_for()

    page.goto(f"{base}/article.html?slug=activer-workspace&source=workspace", wait_until="domcontentloaded")
    page.locator("#managedArticle h1", has_text="Activer Workspace").wait_for()
    assert page.locator("#managedArticle", has_text="Ouvrez votre invitation.").count() == 1
    browser.close()

print("Help Center browser content integration OK")
