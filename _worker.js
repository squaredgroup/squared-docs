const SETTINGS_URL = 'https://workspace.squaredgroup.studio/v1/public/web-content/docs/settings';

async function siteSettings() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(SETTINGS_URL, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.version > 0 ? payload.settings : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function safeURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function htmlAttribute(value) {
  return String(value).replace(/[&"<>]/g, character => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[character]);
}

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const path = new URL(request.url).pathname;
    if (request.method !== 'GET' || !['/', '/index.html'].includes(path) || !response.headers.get('content-type')?.includes('text/html')) return response;
    const settings = await siteSettings();
    if (!settings) return response;

    const rewriter = new HTMLRewriter()
      .on('title', { element(element) { if (settings.seoTitle) element.setInnerContent(settings.seoTitle); } })
      .on('meta[name="description"]', { element(element) { if (settings.seoDescription) element.setAttribute('content', settings.seoDescription); } })
      .on('meta[property="og:title"]', { element(element) { if (settings.seoTitle) element.setAttribute('content', settings.seoTitle); } })
      .on('meta[property="og:description"]', { element(element) { if (settings.seoDescription) element.setAttribute('content', settings.seoDescription); } })
      .on('head', { element(element) {
        const image = safeURL(settings.socialImageURL);
        const icon = safeURL(settings.faviconURL);
        if (settings.siteName) element.append(`<meta name="application-name" content="${htmlAttribute(settings.siteName)}">`, { html: true });
        if (image) element.append(`<meta property="og:image" content="${htmlAttribute(image)}">`, { html: true });
        if (icon) element.append(`<link rel="icon" href="${htmlAttribute(icon)}">`, { html: true });
      } });
    const rewritten = rewriter.transform(response);
    rewritten.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    return rewritten;
  }
};
