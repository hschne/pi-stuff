---
name: seo-onpage
description: Optimize a page's on-page SEO and AI-search visibility — title tag, meta description, headings, answer-first intro, internal links, image alt text, and JSON-LD structured data. Use to write or fix meta tags and titles, add schema markup, improve heading structure, target featured snippets, demonstrate E-E-A-T, or make a page citable by AI search (GEO / ChatGPT / Perplexity / Google AI Overviews).
---

# SEO On-page

Give the searcher what the title promised, fast, and prove it mechanically.

## Core Rules

- **Match intent before mechanics.** Confirm the page delivers the job the target query implies (see the seo-keywords map). No title tweak rescues an intent mismatch.
- **Answer first (inverted pyramid).** Deliver what the title promised in the first sentence or two, then elaborate. This is the same move that wins featured snippets and gets the passage cited by AI search — GEO and good on-page are one job, not two.
- **Title tag: unique, descriptive, primary keyword near the front, ~55-60 chars** so it is not truncated in results. The title is the main thing searchers judge before clicking.
- **Meta description: ~150-155 chars, compelling, expands the title.** Not a ranking factor, but it drives click-through; if you leave it empty the engine invents a poor one.
- **One H1 stating the page topic; logical H2/H3 hierarchy with descriptive headings.** Google uses headings to understand structure. "Finding a venue" beats "Step 3".
- **Information gain + visible E-E-A-T.** Bring something the top results lack — data, first-hand experience, concrete examples — and show credibility on the page (author, sources, lived experience). Originality is something Google actively rewards; covering only what competitors cover is not enough.
- **Descriptive URL slug and descriptive internal-link anchors** to related pages. Internal links pass context and authority to the pages they point at.
- **Images: descriptive filename + alt text, explicit width/height.** Alt helps understanding and accessibility; dimensions also prevent layout shift (CLS).
- **JSON-LD structured data that matches visible content.** Mark up only what is on the page. Pick types that fit and that the SERP rewards (Article, FAQPage, HowTo, BreadcrumbList). Skip `llms.txt` — large-sample studies show no measured effect on AI citations.

## Workflow

1. Read the page and its target query (from `.seo/KEYWORDS.md` or the brief).
2. Fix intent/format first if the page does not match what ranks.
3. Rewrite title and meta description; make the intro answer-first.
4. Fix heading structure (one H1, descriptive, hierarchical); fill topic gaps.
5. Add internal links with descriptive anchors; fix image filenames/alt/dimensions.
6. Add or correct JSON-LD for the matching type.
7. Verify against the rendered page.

Implementation is platform-specific. On Jekyll, configure titles, descriptions, canonical URLs, Open Graph data, and JSON-LD through `jekyll-seo-tag` rather than hand-writing duplicate tags.

## Verify

Read the rendered DOM with the chrome-devtools MCP — templates resolve at build time, so never trust the source. Load the built or live page, then `chrome_devtools_evaluate_script`:

```js
() => ({
  title: document.title,
  titleLen: document.title.length,
  metaDesc: document.querySelector("meta[name=description]")?.content ?? null,
  metaDescLen: (document.querySelector("meta[name=description]")?.content ?? "")
    .length,
  h1s: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim()),
  headings: [...document.querySelectorAll("h1,h2,h3")].map(
    (h) => h.tagName + " " + h.textContent.trim(),
  ),
  canonical: document.querySelector("link[rel=canonical]")?.href ?? null,
  ogImage: document.querySelector('meta[property="og:image"]')?.content ?? null,
  imgsMissingAlt: [...document.images].filter((i) => !i.alt).map((i) => i.src),
  jsonLd: [
    ...document.querySelectorAll('script[type="application/ld+json"]'),
  ].map((s) => s.textContent),
});
```

Confirm: exactly one H1, title 55-60 chars, meta description present and ~150-155 chars, canonical absolute, `og:image` absolute, no images missing alt. Validate JSON-LD with Google's Rich Results Test and validator.schema.org.
