---
name: seo-performance
description: Measure and fix Core Web Vitals for SEO — LCP, INP, and CLS. Use to diagnose slow pages, improve PageSpeed or Lighthouse scores, fix layout shift or slow loading that hurts ranking, or check a page's Core Web Vitals against Google's thresholds.
---

# SEO Performance

Core Web Vitals are a real ranking input; fix the ones real users actually fail.

## Core Rules

- **Field data beats lab.** Google Search uses real-user data (CrUX, the Search Console Core Web Vitals report), measured at the 75th percentile. A green Lighthouse lab score with red field data still hurts — prioritize field failures. Lab tools are for debugging, not for the verdict.
- **Thresholds (good):** LCP < 2.5s, INP < 200ms, CLS < 0.1. FID was retired and replaced by INP in March 2024 — never reference FID.
- **Fix LCP** (loading of the largest element, usually the hero image or main heading): serve a right-sized modern image (AVIF/WebP), `preload` it with `fetchpriority="high"`, remove render-blocking CSS/JS, and use a CDN. LCP is dominated by one element — find it and make it arrive first.
- **Fix INP** (responsiveness): cut and defer JavaScript, break long main-thread tasks, and lighten event handlers. Static pages with little JS usually pass INP by default.
- **Fix CLS** (visual stability): set explicit `width`/`height` or `aspect-ratio` on every image, embed, and ad slot; reserve space for anything injected late; avoid inserting content above existing content; and preload fonts to avoid late reflow.

## Workflow

1. Get field data first: PageSpeed Insights (includes CrUX) or the Search Console Core Web Vitals report. This decides what is actually worth fixing.
2. Reproduce and diagnose in the lab with the chrome-devtools MCP (below).
3. Fix by metric, attacking the failing one — do not blanket-optimize.
4. Re-measure; confirm the failing metric moved.

## Verify

Diagnose in the lab with the chrome-devtools MCP:

- `chrome_devtools_performance_start_trace` (reload the page), let it settle, `chrome_devtools_performance_stop_trace`, then `chrome_devtools_performance_analyze_insight` on LCP or CLS for the element-level breakdown (what the LCP element is, which nodes shifted).
- `chrome_devtools_lighthouse_audit` for a performance score plus ranked opportunities.

Lab tools cannot measure INP directly (it needs real interactions) or report field percentiles — confirm the real-world result in PageSpeed Insights / Search Console after deploying.
