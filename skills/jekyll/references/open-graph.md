# Open Graph & Social Previews

How link previews work across platforms, what image to ship, and why your change "didn't show up."

## Required vs Recommended Tags

The Open Graph protocol (ogp.me) defines four **required** properties:

- `og:title` — the title shown in the card
- `og:type` — `website` for most pages, `article` for posts
- `og:image` — preview image URL (absolute HTTPS)
- `og:url` — canonical URL of the page

Strongly recommended: `og:description`, `og:site_name`, `og:locale`, and `og:image:width`/`og:image:height`/`og:image:alt`. `jekyll-seo-tag` emits all of these when configured (see the seo reference). Without OG tags, scrapers fall back to guessing from `<title>` and page content — usually badly.

## Twitter / X Cards

- `twitter:card` — `summary` (small square thumb) or `summary_large_image` (wide banner). You almost always want the large image; it only activates when an image is present.
- `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt`.
- `twitter:site` (the publication's @handle) and `twitter:creator` (the author's @handle) — distinct on purpose.

X falls back to Open Graph tags for anything `twitter:*` doesn't specify, so you don't need to duplicate everything.

## The `og:description` "missing" false positive

`jekyll-seo-tag` emits `og:description` on a combined `<meta name="twitter:description" property="og:description">`. Compliant scrapers read it; some naive testers report it missing. It is not a real bug — see the seo reference for the one-line standalone-tag workaround if a tester forces your hand.

## Image Specs

A single **1200×630 PNG** is the safe target that renders as a large card everywhere. Details, with the honest caveat that exact limits come from platform docs and SEO blogs that drift and disagree — verify against current platform docs if a platform misbehaves:

| Platform      | Recommended | Aspect | Max size (reported) |
| ------------- | ----------- | ------ | ------------------- |
| Facebook      | 1200×630    | 1.91:1 | ~8 MB               |
| X/Twitter     | 1200×628    | 1.91:1 | ~5 MB               |
| LinkedIn      | 1200×627    | 1.91:1 | ~5 MB               |
| Discord/Slack | 1200×630    | 1.91:1 | —                   |

Practical rules that actually matter:

- **Absolute HTTPS URL, publicly reachable, no auth, no login wall.** Relative URLs and gated images fail silently.
- **Width ≥ 1200** or LinkedIn/Twitter may downgrade to the small card.
- **PNG for text and logos** (crisp edges), **JPEG for photos** (smaller). Keep it well under 5 MB.
- **Set `og:image:width`/`height`.** LinkedIn in particular uses them to render the large card immediately instead of re-fetching.
- **Always set `og:image:alt`** for accessibility.

## Why Your Preview Didn't Update (the #1 issue)

Platforms cache OG data aggressively — often for days — keyed by URL. After deploying a change you must force a re-scrape:

- **Facebook** — [Sharing Debugger](https://developers.facebook.com/tools/debug/), then **Scrape Again**.
- **LinkedIn** — [Post Inspector](https://www.linkedin.com/post-inspector/) re-fetches and refreshes the cache.
- **X/Twitter** — retired its public Card Validator (~2022). No official replacement; verify `twitter:*` tags by hand and test by posting the URL (previews still cache hard).

If a preview shows stale or missing data, suspect the cache or a stale deploy before suspecting your tags. Confirm the **live** HTML actually contains the tags: `curl -s https://yoursite/ | grep -i 'og:'`.

## Generating the OG Image

Two approaches, in order of quality:

1. **Purpose-built template (best).** A dedicated 1200×630 page or layout with controlled typography, logo, and headline, rendered once to PNG. You get legible text and on-brand framing instead of whatever happens to be at the top of the page.

2. **Screenshot of the live hero (fast, good enough).** Render the served homepage at 1200×630 with headless Chromium and capture the top viewport. Use `scripts/og-screenshot.sh`:

   ```bash
   # serve the site, then:
   scripts/og-screenshot.sh http://127.0.0.1:4000/ assets/og.png        # default color scheme
   scripts/og-screenshot.sh http://127.0.0.1:4000/ assets/og.png dark   # force dark for dark-first sites
   ```

   Headless Chromium defaults to `prefers-color-scheme: light`; pass `dark` to capture a dark-first design correctly. Verify the output is `1200x630` and that fonts/icons rendered (`file assets/og.png`, then eyeball it) — webfonts and async content sometimes need the virtual-time budget the script already sets.

For interaction-heavy pages (dismiss a cookie banner, wait for a specific element), drive Playwright instead and screenshot after the page settles.

## Sources

- https://ogp.me/
- https://developers.facebook.com/docs/sharing/webmasters/
- https://developer.x.com/en/docs/x-for-websites/cards/overview/abouts-cards
- https://www.linkedin.com/post-inspector/
