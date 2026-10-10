/**
 * Build-time content transform for the Waymark JS documentation site.
 *
 * Reads the page list from the markdown links in docs/llms.txt, strips
 * per-file frontmatter plus the api-contract marker comments, renders each page
 * with marked (GitHub-flavoured markdown) and highlight.js, and returns the
 * pages keyed by route plus the ordered navigation and per-page pager links.
 *
 * The rendering rules are kept stable so the generated pages stay
 * byte-compatible in behaviour:
 *   - GitHub-style heading ids, with duplicate disambiguation
 *   - content headings (h2+) wrap their text in a WordPress-style self-link
 *     (`.heading-anchor`) pointing at the heading's own id; the id stays on the
 *     heading so existing cross-page anchors keep resolving
 *   - GitHub alerts (NOTE/TIP/IMPORTANT/WARNING/CAUTION) become branded
 *     `.alert` callouts (see the OpenGIS branding stylesheet)
 *   - relative .md links become site routes; other relative hrefs that escape
 *     the site become GitHub blob URLs; llms.txt/llms-full.txt stay relative
 *   - image embeds render as a semantic <figure> whose <figcaption> carries
 *     the markdown image title, or the alt text when no title is given
 *   - fenced code blocks with a known language are highlighted at build time
 *   - wide tables scroll inside their own container
 *
 * `baseURL` is baked into document links and image sources so a non-root
 * `app.baseURL` (for example /Waymark-JS/) still resolves correctly; the
 * payload itself keeps logical routes so NuxtLink applies the base URL once.
 */

import fs from "node:fs";
import path from "node:path";
import hljs from "highlight.js";
import { Marked } from "marked";

const REPO_BLOB = "https://github.com/OpenGIS/Waymark-JS/blob/master";
const LLMS_FILES = new Set(["llms.txt", "llms-full.txt"]);

// GitHub alert types: label, CSS suffix, and octicon name.
const ALERTS = {
  NOTE: { label: "Note", type: "note", icon: "info" },
  TIP: { label: "Tip", type: "tip", icon: "light-bulb" },
  IMPORTANT: { label: "Important", type: "important", icon: "report" },
  WARNING: { label: "Warning", type: "warning", icon: "alert" },
  CAUTION: { label: "Caution", type: "caution", icon: "stop" },
};

// GitHub octicons (16x16), inlined so the site stays dependency-free at runtime.
const OCTICONS = {
  info: '<path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>',
  "light-bulb":
    '<path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"/>',
  report:
    '<path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>',
  alert:
    '<path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>',
  stop: '<path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>',
};

// Strip YAML frontmatter (--- ... ---) from the top of a file
function stripFrontmatter(content) {
  return content.replace(/^---[\s\S]*?---\n?/, "");
}

// Strip api-contract marker comments (sync automation internals)
function stripContractMarkers(content) {
  return content.replace(/^\s*<!--\s*api-contract:.*?-->\s*\n?/gm, "");
}

// Map a docs source filename to its site route
function routeFor(target) {
  if (target === "README.md") return "/";
  return `/${target.replace(/^\d+\./, "").replace(/\.md$/, "")}`;
}

// Extract the leading number from a docs filename (1.api.md -> 1)
function fileNumber(target) {
  const match = target.match(/^(\d+)\./);
  return match ? Number(match[1]) : null;
}

// Extract the first H1 from a (frontmatter-stripped) markdown source
function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  if (!match) return "Waymark JS";
  return match[1]
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

// GitHub-style heading slug, with duplicate disambiguation (-1, -2, ...)
function headingSlug(text, seen) {
  const base =
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s/g, "-") || "section";
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

// Join a logical site route onto the configured base URL. Kept dependency-free
// so the payload can be generated outside the Nuxt runtime.
function withBase(baseURL, route) {
  const base = baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
  return `${base}${route.startsWith("/") ? route : `/${route}`}`;
}

// Resolve a relative path from a docs page to a repository-relative path.
// Resolution is anchored at docs/, then re-expressed from the repo root, so
// both escapes (../src/x.js -> src/x.js) and repo-root refs (scripts/x.mjs ->
// scripts/x.mjs) normalise to the path GitHub expects.
function toRepoPath(href) {
  const resolved = path.posix.normalize(path.posix.join("docs", href));
  const relative = resolved.startsWith("docs/")
    ? resolved.slice("docs/".length)
    : resolved;
  return relative.replace(/^\.\//, "");
}

// Build a href rewriter bound to the route map and base URL.
function createHrefRewriter(routeMap, baseURL) {
  return function rewriteHref(href) {
    if (!href || href.startsWith("#")) return href;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return href; // protocol (http:, mailto:, ...)
    if (href.startsWith("/") || href.startsWith("//")) return href; // absolute

    const hashIndex = href.indexOf("#");
    const target = hashIndex === -1 ? href : href.slice(0, hashIndex);
    const fragment = hashIndex === -1 ? "" : href.slice(hashIndex);
    if (!target) return href;

    const mapped = routeMap.get(path.posix.normalize(target));
    if (mapped) return withBase(baseURL, mapped) + fragment;

    if (LLMS_FILES.has(path.posix.basename(target))) return href;

    return `${REPO_BLOB}/${toRepoPath(target)}${fragment}`;
  };
}

// Screenshots live at the repository root and are copied into the site's
// public directory. Absolute and protocol URLs are left untouched; any other
// relative image src is unexpected and is collected so the run can report it
// rather than silently emitting a broken path.
const unexpectedImageSrcs = new Set();

function rewriteImageSrc(src, baseURL) {
  if (!src) return src;
  if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return src; // protocol (http:, data:, ...)
  if (src.startsWith("/") || src.startsWith("//")) return src; // absolute
  if (src.startsWith("../screenshots/")) {
    return withBase(baseURL, src.slice("../".length));
  }
  unexpectedImageSrcs.add(src);
  return src;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderContent(markdown, routeMap, baseURL) {
  const seen = new Map();
  const rewriteHref = createHrefRewriter(routeMap, baseURL);

  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading(token) {
        const text = this.parser.parseInline(token.tokens);
        const id = headingSlug(token.text, seen);
        // WordPress-style self-link on content headings. Skip headings that
        // already contain a link so the anchor is never nested.
        const selfLink =
          token.depth >= 2 && !text.includes("<a ")
            ? `<a class="heading-anchor" href="#${id}">${text}</a>`
            : text;
        return `<h${token.depth} id="${id}">${selfLink}</h${token.depth}>\n`;
      },
      link(token) {
        const href = rewriteHref(token.href);
        const text = this.parser.parseInline(token.tokens);
        const title = token.title ? ` title="${token.title}"` : "";
        return `<a href="${href}"${title}>${text}</a>`;
      },
      image(token) {
        const src = rewriteImageSrc(token.href, baseURL);
        const alt = token.tokens
          ? this.parser.parseInline(token.tokens, this.parser.textRenderer)
          : token.text;
        const caption = token.title ? token.title : alt;
        return `<figure>\n<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">\n<figcaption>${escapeHtml(caption)}</figcaption>\n</figure>`;
      },
      // A lone image renders as a block-level <figure>; emitting it inside the
      // default <p> wrapper would be invalid, so unwrap single-image paragraphs.
      paragraph(token) {
        if (token.tokens.length === 1 && token.tokens[0].type === "image") {
          return `${this.parser.parseInline(token.tokens)}\n`;
        }
        return false;
      },
      code(token) {
        const lang = (token.lang || "").trim().split(/\s+/)[0];
        const language = lang && hljs.getLanguage(lang) ? lang : null;
        const value = language
          ? hljs.highlight(token.text, { language, ignoreIllegals: true }).value
          : escapeHtml(token.text);
        const cls = language ? ` class="hljs language-${language}"` : "";
        return `<pre><code${cls}>${value}</code></pre>\n`;
      },
      // Wide docs tables must scroll inside their own container rather than
      // forcing the whole page horizontally at narrow widths.
      table(token) {
        const cell = (c) => {
          const tag = c.header ? "th" : "td";
          const align = c.align ? ` align="${c.align}"` : "";
          return `<${tag}${align}>${this.parser.parseInline(c.tokens)}</${tag}>`;
        };
        const head = token.header.map(cell).join("");
        const body = token.rows
          .map((row) => `<tr>${row.map(cell).join("")}</tr>`)
          .join("\n");
        return `<div class="table-wrap">\n<table>\n<thead>\n<tr>${head}</tr>\n</thead>\n<tbody>\n${body}\n</tbody>\n</table>\n</div>\n`;
      },
      blockquote(token) {
        const body = this.parser.parse(token.tokens);
        const match = body.match(
          /^<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\n|<br>)?/,
        );
        if (!match) return false;

        const alert = ALERTS[match[1]];
        const icon = `<svg viewBox="0 0 16 16" aria-hidden="true">${OCTICONS[alert.icon]}</svg>`;
        const content = body.replace(
          match[0],
          `<p class="alert-title">${icon}${alert.label}</p>\n<p>`,
        );
        return `<div class="alert alert-${alert.type}">\n${content}</div>\n`;
      },
    },
  });

  return marked.parse(markdown);
}

/**
 * Build the documentation payload: pages keyed by logical route, plus the
 * ordered navigation (Home first, then docs by filename number) and per-page
 * previous/next pager links derived from that same reading order.
 *
 * @param {{ docsDir: string, baseURL?: string }} options
 * @returns {{ pages: Record<string, object>, nav: Array<{route: string, label: string}>, unexpectedImageSrcs: string[] }}
 */
export function buildDocsPayload({ docsDir, baseURL = "/" }) {
  const index = fs.readFileSync(path.join(docsDir, "llms.txt"), "utf8");
  const targets = [...index.matchAll(/\]\(([^)]+\.md)\)/g)].map(
    (match) => match[1],
  );
  const routeMap = new Map(targets.map((target) => [target, routeFor(target)]));

  const pages = targets.map((target) => {
    const source = stripContractMarkers(
      stripFrontmatter(fs.readFileSync(path.join(docsDir, target), "utf8")),
    );
    const isHome = target === "README.md";
    const number = fileNumber(target);
    const title = extractTitle(source);
    const route = routeFor(target);
    return {
      target,
      route,
      isHome,
      number,
      title,
      label: isHome ? "Home" : `${number}. ${title}`,
      html: renderContent(source, routeMap, baseURL),
    };
  });

  const home = pages.find((page) => page.isHome);
  const docPages = pages
    .filter((page) => !page.isHome)
    .sort((a, b) => a.number - b.number);
  const ordered = home ? [home, ...docPages] : docPages;

  const pagesByRoute = {};
  ordered.forEach((page, index) => {
    const prev = index > 0 ? ordered[index - 1] : null;
    const next = index < ordered.length - 1 ? ordered[index + 1] : null;
    pagesByRoute[page.route] = {
      route: page.route,
      title: page.title,
      html: page.html,
      prev: prev ? { route: prev.route, label: prev.label } : null,
      next: next ? { route: next.route, label: next.label } : null,
    };
  });

  return {
    pages: pagesByRoute,
    nav: ordered.map(({ route, label }) => ({ route, label })),
    unexpectedImageSrcs: [...unexpectedImageSrcs].sort(),
  };
}
