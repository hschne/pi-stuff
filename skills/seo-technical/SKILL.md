---
name: seo-technical
description: Fix technical SEO and crawlability — robots.txt, XML sitemap, canonical tags, noindex and indexability, HTTPS, redirects, and mobile-first. Use to diagnose why a page is not indexed or crawled, resolve canonical or duplicate-content issues, check or generate robots.txt and sitemaps, fix redirect chains, or run a technical SEO check.
---

# SEO Technical

A page that cannot be crawled and indexed cannot rank — check that first, before anything cosmetic.

## Core Rules

- **Indexability is the gate.** For each target page confirm: it returns HTTP 200, robots.txt allows it, it carries no stray `noindex`, and its canonical points where you intend. A single wrong `noindex` or conflicting canonical silently removes a page from search — these are the most common invisible killers.
- **One self-referencing canonical per page**, unless you are deliberately consolidating duplicates onto one URL. Conflicting or chained canonicals confuse indexing.
- **XML sitemap lists only canonical, indexable, 200 URLs**, is referenced in robots.txt, and is submitted in Search Console. Do not list redirected, noindexed, or canonicalized-away URLs.
- **Do not block CSS or JS in robots.txt.** Google renders pages; blocking assets breaks how it sees the layout and mobile-friendliness.
- **HTTPS everywhere, no mixed content; redirects are single-hop 301.** Chains and loops waste crawl budget and leak signals.
- **Mobile-first: viewport meta, responsive layout, same content as desktop.** Google indexes the mobile rendering; content hidden on mobile is content it may not count.
- **If AI-search visibility matters, allow AI crawlers** (GPTBot, PerplexityBot, Google-Extended) in robots.txt. Blocking them forfeits the GEO upside; there is no `llms.txt` substitute.

## Workflow

1. List target URLs (from the brief or sitemap).
2. Check indexability per URL (status, robots, noindex, canonical).
3. Validate robots.txt and sitemap.xml.
4. Check HTTPS/mixed content and redirect hops.
5. Confirm mobile viewport and content parity.
6. Fix; re-verify.

Implementation is platform-specific. On Jekyll, `jekyll-sitemap` emits `/sitemap.xml`; add `robots.txt` separately and verify both from the built site.

## Verify

Use the chrome-devtools MCP against the live/built site:

- `chrome_devtools_navigate_page` to the URL, then `chrome_devtools_list_network_requests` — confirm the document is 200 and there are no redirect chains or mixed-content (http:// on an https page) requests.
- `chrome_devtools_evaluate_script` to read directives:

```js
() => ({
  robotsMeta: document.querySelector("meta[name=robots]")?.content ?? null,
  canonical: document.querySelector("link[rel=canonical]")?.href ?? null,
  viewport: document.querySelector("meta[name=viewport]")?.content ?? null,
});
```

- Fetch `/robots.txt` and `/sitemap.xml` as pages and confirm they exist, robots.txt links the sitemap, and the sitemap lists canonical URLs.

For ground truth on whether Google actually indexed a URL, use Search Console URL Inspection — no crawler simulation substitutes for it.
