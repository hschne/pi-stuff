# jekyll-seo-tag Reference

`{% seo %}` (gem `jekyll-seo-tag`) generates title, description, canonical, Open Graph, Twitter card, and JSON-LD tags from `_config.yml` and front matter. It is on the GitHub Pages safelist, so it works on the native Pages build with no extra setup.

## Exactly What It Emits

From the plugin template, for a typical page with an image configured:

- `<title>` (suppressible with `{% seo title=false %}`)
- `<meta name="generator">`
- `og:title` (from `page.title`), `og:locale` (from `lang`), `og:site_name` (from `title`), `og:url`, `og:type`
- `<meta name="description">` and a combined `<meta name="twitter:description" property="og:description">`
- `<link rel="canonical">` (suppressible with `canonical=false`)
- `og:image` + `og:image:width|height|alt` (when provided)
- `twitter:card`, `twitter:image`, `twitter:image:alt`, `twitter:title`, `twitter:site`, `twitter:creator`
- `<script type="application/ld+json">` WebSite/Article JSON-LD
- Optional `fb:app_id`/`article:publisher`, webmaster verification metas, `rel=prev/next` for paginators

## What It Does NOT Do

Do not assume these are handled — you add them yourself:

- No `<meta charset>`, viewport, theme-color, or favicons.
- No `sitemap.xml` or `robots.txt` — add `jekyll-sitemap`.
- No RSS/Atom feed — add `jekyll-feed`.
- No `preconnect`/`preload`, no image resizing, no OG image generation.

## Minimal Config

```yaml
title: My Site
tagline: short descriptor
description: >-
  One or two sentences for meta description and og:description.
url: https://example.com
baseurl: ""
lang: en
author:
  name: Jane Doe
  twitter: janedoe # author-specific handle -> twitter:creator
image: /assets/og.png # site-wide default; override per page
twitter:
  username: janedoe # site handle -> twitter:site
  card: summary_large_image
plugins:
  - jekyll-seo-tag
```

Per-page overrides go in front matter: `title`, `description`, `image`, `author`, `canonical_url`, and a `seo:` block (`name`, `type`, `links`, `date_modified`) for JSON-LD control.

## Sharp Edges (each one bites in practice)

**Auto-generated descriptions are usually junk.** With no `description` set, the plugin uses the first 100 words of page content. For a homepage that starts with a nav or a heading, that produces a useless preview. Always set `description` in `_config.yml` (site default) and override per page where it matters. Tune length with `seo_description_max_words` if needed.

**`og:title` comes from `page.title`, not `<title>`.** A page titled `Icons` yields `og:title: Icons` even though `<title>` reads `Icons | My Site`. For a homepage you almost always want the brand name. Set the homepage `title` equal to the site `title`:

- When `page.title == site.title`, the plugin renders `<title>` as `site.title | tagline` (or `| description` if no `tagline`) and `og:title` as just `site.title`.
- So set a short `tagline` to keep `<title>` readable while `og:title` stays the clean brand name. Without a tagline, the full description gets appended to `<title>` — long and ugly.

**`twitter:creator` ≠ `twitter:site`.** `creator` is the author's handle (`author.twitter`), `site` is the publication's (`twitter.username`). A bare string `author: janedoe` becomes `twitter:creator: @janedoe` — wrong whenever the person's handle differs from their username elsewhere (e.g. a GitHub login). Use the `author` hash with an explicit `twitter:` key.

**`twitter:card` only upgrades to `summary_large_image` when an image is resolved.** No image → `summary` (small card), regardless of the `twitter.card` config. Always provide an `image`.

**The merged `name="twitter:description" property="og:description"` tag is valid, but naive testers flag it.** The plugin puts both attributes on one element; OGP-compliant scrapers (Facebook, LinkedIn) read the `property` fine. Some third-party preview testers bucket tags by `name=` and report `og:description` as missing — a false positive on real platforms. If you need to satisfy those testers, emit a standalone tag right after `{% seo %}` (compliant scrapers dedupe on identical content):

```html
{% seo %}
<meta
  property="og:description"
  content="{{ page.description | default: site.description | strip_html | normalize_whitespace | escape }}"
/>
```

This is a workaround for tooling, not a real bug; it creates a harmless duplicate. A code formatter may wrap the long tag across lines — still valid, since scrapers parse the DOM, not source lines.

**`url` must be set or social/canonical URLs are relative.** `og:url`, `canonical`, and absolute `og:image` all depend on `site.url`. Relative og:image is rejected by most scrapers.

## Verify

```bash
bundle exec jekyll build
sed -n '/Begin Jekyll SEO/,/End Jekyll SEO/p' _site/index.html
```

Confirm: `og:title` is the brand (not a section name), `description`/`og:description` are real sentences, `og:image` is an absolute `https://` URL, and `twitter:card` is `summary_large_image`.

## Sources

- https://jekyll.github.io/jekyll-seo-tag/usage/
- https://jekyll.github.io/jekyll-seo-tag/advanced-usage/
- https://github.com/jekyll/jekyll-seo-tag/blob/master/lib/template.html
