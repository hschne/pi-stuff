---
name: jekyll
description: Scaffold and configure a new Jekyll static site — structure, _config.yml, layouts, data-driven pages, SEO/Open Graph metadata, and GitHub Pages deployment. Use when creating a new Jekyll site or blog, setting up _config.yml, wiring jekyll-seo-tag, adding Open Graph / Twitter card / social preview tags, generating an OG image, configuring url/baseurl for GitHub Pages or a custom domain, or debugging why social previews or asset links break.
---

# Jekyll

Build a new Jekyll site with correct URLs, working social previews, and a deploy path that does not surprise you later.

## Core Rules

- **Set `url` and `baseurl` first; they are the root cause of most Jekyll bugs.** `url` is the scheme+host origin with no trailing slash (`https://example.com`). `baseurl` is the path the site is served under: `""` for a user/org site or custom domain, `"/repo-name"` for a project site at `user.github.io/repo-name`. A wrong `baseurl` breaks every asset and link at once.
- **Reference internal URLs through filters, never hardcode paths.** `{{ '/assets/x.css' | relative_url }}` for links/assets, `{{ '/assets/og.png' | absolute_url }}` where an absolute URL is required (og:image, RSS). Hardcoded `/assets/...` works locally and on apex domains, then breaks the moment the site moves under a `baseurl`.
- **Let `jekyll-seo-tag` own the metadata.** Put `{% seo %}` in `<head>` and configure via `_config.yml` / front matter rather than hand-writing OG tags. You still add `<meta charset>`, viewport, stylesheets, and favicons yourself — the plugin does not.
- **Scope plugins to your deploy target.** GitHub Pages' native build only runs a fixed safelist (seo-tag, sitemap, feed are on it). Anything else requires building via GitHub Actions. Decide this before adding plugins.
- **Verify the built HTML, not the source.** Liquid and the SEO plugin only resolve at build time. Grep `_site/` after every build (commands below).

## Workflow

### 1. Scaffold

`jekyll new site --blank` gives an empty skeleton you control; `jekyll new site` pulls the `minima` theme (more to strip than to keep for a custom site). Manage gems with Bundler:

```ruby
# Gemfile
source "https://rubygems.org"
gem "jekyll", "~> 4.4"
gem "jekyll-seo-tag"
gem "jekyll-sitemap"   # blogs/feeds: add gem "jekyll-feed"
```

```bash
bundle install
```

Commit `Gemfile.lock` when you control the build (Actions/local) — it pins versions for reproducible builds. It is irrelevant under GitHub Pages' native build, which uses its own `github-pages` gem set.

In sandboxes where `~/.gem` or `~/.npm` is read-only, redirect caches: `export GEM_SPEC_CACHE=$(mktemp -d)` and `bundle config set --local path vendor/bundle`. Add `vendor/` and `_site/` to `.gitignore`.

### 2. Configure `_config.yml`

```yaml
title: My Site
tagline: short descriptor # keeps the homepage <title> readable (see SEO ref)
description: >- # set this; do not rely on auto-generated descriptions
  One or two sentences. Used for meta description and og:description.
url: https://example.com # origin, no trailing slash
baseurl: "" # "" for custom domain / user site; "/repo" for project site
lang: en
```

Config changes are not picked up by `jekyll serve --watch`; restart the server.

### 3. Layout and SEO

`<head>` needs the things the plugin does not emit, plus `{% seo %}`:

```html
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  {% seo %}
  <link rel="stylesheet" href="{{ '/assets/main.css' | relative_url }}" />
</head>
```

Read the [seo reference](references/seo.md) to wire author/Twitter/image config and avoid its sharp edges (auto-descriptions, homepage `og:title`, author handles).

### 4. Open Graph image and per-page metadata

Add a 1200×630 image and point the page at it with dimensions and alt:

```yaml
# index.html front matter
title: My Site # match site title on the homepage for a clean og:title
image:
  path: /assets/og.png
  width: 1200
  height: 630
  alt: Descriptive alt text
```

Read the [open-graph reference](references/open-graph.md) for image specs, per-platform behavior, cache-busting, and generating the image (a `scripts/og-screenshot.sh` helper is included).

### 5. Sitemap (and feed for blogs)

`jekyll-sitemap` needs only `url` set and emits `/sitemap.xml` automatically. Add a `robots.txt` pointing at it. `jekyll-feed` adds `/feed.xml` for post collections. Neither is provided by `jekyll-seo-tag`.

### 6. Build and verify

```bash
bundle exec jekyll build
# SEO block sanity — title, description, and absolute og:image must be present and correct:
sed -n '/Begin Jekyll SEO/,/End Jekyll SEO/p' _site/index.html
# og:image must be absolute and reachable:
grep -o 'og:image"[^>]*' _site/index.html
```

Check that internal links in `_site/` carry the `baseurl` prefix (project sites) and that no asset 404s when serving: `bundle exec jekyll serve` then load the page.

### 7. Deploy

Read the [deployment reference](references/deployment.md) for GitHub Pages native vs Actions, the plugin safelist, custom domains (CNAME), and the `url`/`baseurl` matrix. After deploying, social caches are stale — re-scrape via the platform debuggers (open-graph ref), not by re-sharing.

## References

Read the reference that matches the current task:

| Topic               | When to Read                                                           | Reference                              |
| ------------------- | ---------------------------------------------------------------------- | -------------------------------------- |
| seo metadata        | Wiring `jekyll-seo-tag`, titles, descriptions, author/Twitter, JSON-LD | [seo](references/seo.md)               |
| open graph / social | OG & Twitter tags, image specs, previews/cache-busting, OG image gen   | [open-graph](references/open-graph.md) |
| deployment          | GitHub Pages vs Actions, plugin safelist, custom domain, url/baseurl   | [deployment](references/deployment.md) |

## Scripts

| Script                     | Purpose                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `scripts/og-screenshot.sh` | Render a 1200×630 OG image from a served URL with headless Chromium. |
