(() => {
  "use strict";

  const API_BASE = "https://workspace.squaredgroup.studio/v1/public/web-content/docs";
  const COLLECTIONS = ["articles", "categories", "faqs", "navigation", "releases"];
  const state = Object.fromEntries(COLLECTIONS.map(key => [key, []]));

  const element = (tag, attributes = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
      if (value == null) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = String(value);
      else node.setAttribute(key, String(value));
    }
    for (const child of children.flat()) if (child) node.append(child);
    return node;
  };

  const itemData = item => ({ id: item?.id || "", ...(item?.data || {}) });
  const publicURL = value => {
    if (!value) return "";
    try {
      const url = new URL(String(value), location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  };
  const formattedDate = value => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date)
      : "Publié depuis Workspace";
  };
  const identity = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const currentPage = () => (location.pathname.split("/").filter(Boolean).pop() || "index").replace(/\.html$/i, "");
  const blocksOf = item => Array.isArray(item?.contentBlocks) ? item.contentBlocks.filter(block => block && typeof block === "object") : [];
  const blockClass = block => [
    "sq-content-block",
    `is-${String(block.kind || "paragraph").toLowerCase().replaceAll("_", "-")}`,
    `tone-${String(block.tone || "neutral").toLowerCase()}`,
    `presentation-${String(block.presentation || "plain").toLowerCase()}`,
    `align-${String(block.alignment || "leading").toLowerCase()}`,
    `width-${String(block.width || "standard").toLowerCase()}`,
    `size-${String(block.size || "medium").toLowerCase()}`
  ].join(" ");

  function appendInlineText(node, source) {
    const value = String(source || "");
    const pattern = /(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
    let cursor = 0;
    for (const match of value.matchAll(pattern)) {
      if (match.index > cursor) node.append(document.createTextNode(value.slice(cursor, match.index)));
      const token = match[0];
      if (token.startsWith("**")) node.append(element("strong", { text: token.slice(2, -2) }));
      else if (token.startsWith("_")) node.append(element("em", { text: token.slice(1, -1) }));
      else {
        const parts = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        const href = publicURL(parts?.[2]);
        node.append(href ? element("a", { href, text: parts[1], ...(href.startsWith(location.origin) ? {} : { target: "_blank", rel: "noopener noreferrer" }) }) : document.createTextNode(parts?.[1] || token));
      }
      cursor = match.index + token.length;
    }
    if (cursor < value.length) node.append(document.createTextNode(value.slice(cursor)));
  }

  function contentBlock(block) {
    const kind = String(block.kind || "PARAGRAPH").toUpperCase();
    const node = element("div", { class: blockClass(block) });
    if (kind === "DIVIDER") return element("hr", { class: blockClass(block) });
    if (kind === "SPACER") return node;
    if (kind === "IMAGE") {
      const source = publicURL(block.url);
      const figure = element("figure", { class: blockClass(block) });
      if (source) figure.append(element("img", { src: source, alt: block.alternativeText || "", loading: "lazy", decoding: "async" }));
      if (block.caption) figure.append(element("figcaption", { text: block.caption }));
      return figure;
    }
    if (kind === "BUTTON") {
      const href = publicURL(block.url);
      return href ? element("a", { class: `${blockClass(block)} sq-content-action`, href, ...(href.startsWith(location.origin) ? {} : { target: "_blank", rel: "noopener noreferrer" }) }, element("span", { text: block.text || "En savoir plus" })) : node;
    }
    if (["BULLETED_LIST", "NUMBERED_LIST"].includes(kind)) {
      const list = element(kind === "NUMBERED_LIST" ? "ol" : "ul");
      String(block.text || "").split("\n").map(value => value.trim()).filter(Boolean).forEach(value => {
        const item = element("li"); appendInlineText(item, value); list.append(item);
      });
      node.append(list);
      return node;
    }
    const tag = kind === "HEADING" ? "h2" : kind === "QUOTE" ? "blockquote" : "p";
    const copy = element(tag);
    appendInlineText(copy, block.text || "");
    if (kind === "CALLOUT") node.append(element("span", { class: "sq-content-callout-mark", "aria-hidden": "true", text: "!" }));
    node.append(copy);
    return node;
  }

  function structuredContent(item, fallback = "") {
    const fragment = document.createDocumentFragment();
    const blocks = blocksOf(item);
    if (blocks.length) blocks.forEach(block => fragment.append(contentBlock(block)));
    else fragment.append(richText(fallback));
    return fragment;
  }

  async function loadCollection(collection) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(`${API_BASE}/${collection}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Flux ${collection} indisponible`);
      const payload = await response.json();
      return Array.isArray(payload?.items) ? payload.items.map(itemData) : [];
    } finally { clearTimeout(timer); }
  }

  function articleLink(item) {
    if (blocksOf(item).length) {
      const url = new URL("article.html", new URL("../", document.querySelector("script[data-sq-help-core]")?.src || location.href));
      url.searchParams.set("slug", item.slug || item.id);
      url.searchParams.set("source", "workspace");
      return url.href;
    }
    const managedURL = publicURL(item.url);
    if (managedURL) return managedURL;
    const url = new URL("article.html", new URL("../", document.querySelector("script[data-sq-help-core]")?.src || location.href));
    url.searchParams.set("slug", item.slug || item.id);
    url.searchParams.set("source", "workspace");
    return url.href;
  }

  function card(item, kind = "article") {
    const href = kind === "navigation" ? publicURL(item.target) : articleLink(item);
    const wrapper = element(href ? "a" : "article", { class: "sq-managed-card", ...(href ? { href } : {}) });
    const image = publicURL(item.image);
    if (image) wrapper.append(element("img", { src: image, alt: "", loading: "lazy", decoding: "async" }));
    const copy = element("span", { class: "sq-managed-card-copy" });
    copy.append(
      element("small", { text: item.category || (kind === "navigation" ? "Accès direct" : "Depuis Workspace") }),
      element("strong", { text: item.title || item.question || "Nouveau contenu" })
    );
    if (item.summary) copy.append(element("span", { text: item.summary }));
    wrapper.append(copy, element("span", { class: "sq-managed-arrow", "aria-hidden": "true", text: "→" }));
    return wrapper;
  }

  function renderHome() {
    if (document.body.dataset.forumPage !== "home") return;
    const articles = state.articles.filter(item => item.featured).concat(state.articles.filter(item => !item.featured)).slice(0, 6);
    const navigation = state.navigation.slice(0, 4);
    const releases = state.releases.slice(0, 2);
    if (!articles.length && !navigation.length && !releases.length) return;

    const section = element("section", { class: "section sq-managed-section", "aria-labelledby": "workspaceContentTitle" });
    section.append(element("div", { class: "section-head" }, element("div", {},
      element("h2", { id: "workspaceContentTitle", text: "Nouveautés du Help Center" }),
      element("p", { text: "Guides et ressources publiés directement depuis Squared Workspace." })
    ), element("span", { class: "sq-managed-live", text: "Synchronisé" })));
    if (articles.length || navigation.length) {
      section.append(element("div", { class: "sq-managed-grid" },
        ...articles.map(item => card(item)),
        ...navigation.map(item => card(item, "navigation"))
      ));
    }
    if (releases.length) {
      section.append(element("div", { class: "sq-managed-releases" }, ...releases.map(item =>
        element("article", {},
          element("small", { text: item.version || "Mise à jour" }),
          element("strong", { text: item.title }),
          element("span", { text: item.summary || formattedDate(item._updatedDate) })
        )
      )));
    }
    const shell = document.querySelector(".shell");
    const anchor = [...document.querySelectorAll(".shell > .section")].find(node => node.textContent.includes("En ce moment"));
    if (anchor) anchor.before(section); else shell?.querySelector("footer")?.before(section);
  }

  function renderFAQs() {
    if (currentPage() !== "faq") return;
    const host = document.querySelector(".faq-stack");
    if (!host || !state.faqs.length) return;
    const existing = new Map([...host.querySelectorAll("details")].map(details => [identity(details.querySelector("summary")?.textContent), details]));
    for (const item of state.faqs) {
      if (host.querySelector(`[data-workspace-slug="${CSS.escape(item.slug || item.id)}"]`)) continue;
      const match = existing.get(identity(item.question || item.title));
      if (match) {
        match.dataset.workspaceSlug = item.slug || item.id;
        match.classList.add("sq-managed-faq");
        const answer = match.querySelector(".faq-answer") || match;
        if (answer) answer.replaceChildren(structuredContent(item, item.body || item.summary || answer.textContent));
        continue;
      }
      const details = element("details", { class: "faq-item sq-managed-faq", "data-workspace-slug": item.slug || item.id });
      const answer = element("div", { class: "faq-answer" });
      answer.append(structuredContent(item, item.body || item.summary || "Réponse disponible prochainement."));
      details.append(element("summary", { text: item.question || item.title }), answer);
      host.append(details);
    }
  }

  function renderReleases() {
    if (currentPage() !== "changelog") return;
    const timeline = document.querySelector(".timeline");
    if (!timeline || !state.releases.length) return;
    const fragment = document.createDocumentFragment();
    for (const item of [...state.releases].reverse()) {
      const match = [...timeline.querySelectorAll(".update")].find(update =>
        (item.version && identity(update.querySelector(".version")?.textContent) === identity(item.version)) ||
        identity(update.querySelector("strong")?.textContent) === identity(item.title)
      );
      if (match) {
        match.classList.add("sq-managed-update");
        match.dataset.workspaceSlug = item.slug || item.id;
        const title = match.querySelector("strong");
        const summary = match.querySelector("p");
        const version = match.querySelector(".version");
        if (title) title.textContent = item.title;
        if (summary) summary.textContent = item.body || item.summary || summary.textContent;
        if (version && item.version) version.textContent = item.version;
        continue;
      }
      const update = element("div", { class: "update sq-managed-update", "data-change-type": "improved" });
      update.append(
        element("time", { text: formattedDate(item._updatedDate) }),
        element("div", {}, element("strong", { text: item.title }), element("p", { text: item.body || item.summary || "Mise à jour publiée depuis Workspace." })),
        element("span", { class: "version", text: item.version || "Nouveau" })
      );
      fragment.append(update);
    }
    timeline.prepend(fragment);
  }

  function richText(body) {
    const fragment = document.createDocumentFragment();
    const lines = String(body || "").replaceAll("\r", "").split("\n");
    let list = null;
    const closeList = () => { if (list) { fragment.append(list); list = null; } };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { closeList(); continue; }
      if (line.startsWith("### ")) { closeList(); fragment.append(element("h3", { text: line.slice(4) })); }
      else if (line.startsWith("## ")) { closeList(); fragment.append(element("h2", { text: line.slice(3) })); }
      else if (line.startsWith("> ")) { closeList(); fragment.append(element("blockquote", { text: line.slice(2) })); }
      else if (/^[-*] /.test(line)) {
        if (!list) list = element("ul");
        list.append(element("li", { text: line.slice(2) }));
      } else { closeList(); fragment.append(element("p", { text: line })); }
    }
    closeList();
    return fragment;
  }

  function renderManagedArticle() {
    const host = document.querySelector("#managedArticle");
    if (!host) return;
    const slug = new URLSearchParams(location.search).get("slug") || "";
    const item = state.articles.find(candidate => candidate.slug === slug || candidate.id === slug);
    if (!item) return;

    host.dataset.workspaceContent = item.id || item.slug;
    host.replaceChildren();
    const header = element("header", { class: "article-head" });
    header.append(
      element("div", { class: "eyebrow", text: `Centre d’aide · ${item.category || "Documentation"}` }),
      element("h1", { text: item.title }),
      item.summary ? element("p", { text: item.summary }) : null,
      element("div", { class: "article-meta" },
        element("span", { class: "pill live", text: "Publié" }),
        element("span", { class: "pill", text: `Mis à jour · ${formattedDate(item._updatedDate)}` })
      )
    );
    const content = element("div", { class: "sq-managed-article-body" });
    content.append(structuredContent(item, item.body || item.summary || ""));
    host.append(header, content);
    document.title = `${item.seoTitle || item.title} — Squared Help Center`;
    const description = document.querySelector('meta[name="description"]') || document.head.appendChild(element("meta", { name: "description" }));
    description.setAttribute("content", item.seoDescription || item.summary || item.title);

    const toc = document.querySelector("#managedToc");
    if (toc) {
      toc.replaceChildren(element("strong", { text: "Sur cette page" }));
      [...content.querySelectorAll("h2,h3")].forEach((heading, index) => {
        heading.id = `section-${index + 1}`;
        toc.append(element("a", { href: `#${heading.id}`, text: heading.textContent }));
      });
    }
  }

  async function boot() {
    const results = await Promise.allSettled(COLLECTIONS.map(loadCollection));
    results.forEach((result, index) => { if (result.status === "fulfilled") state[COLLECTIONS[index]] = result.value; });
    renderHome();
    renderFAQs();
    renderReleases();
    renderManagedArticle();

    const article = document.querySelector("#managedArticle");
    if (article && state.articles.length) {
      const observer = new MutationObserver(() => {
        const slug = new URLSearchParams(location.search).get("slug") || "";
        const item = state.articles.find(candidate => candidate.slug === slug || candidate.id === slug);
        if (item && article.querySelector("h1")?.textContent !== item.title) renderManagedArticle();
      });
      observer.observe(article, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 5000);
    }
    window.dispatchEvent(new CustomEvent("squared:web-content-ready", { detail: { siteKey: "docs", collections: state } }));
  }

  boot().catch(() => {});
})();
