---
name: seo-audit
description: Audit live or built pages and produce a prioritized, falsifiable SEO action plan across indexability, on-page, structured data, Core Web Vitals, and AI-search readiness. Use for an SEO audit, SEO health check, or a "why isn't this site ranking" review of real pages.
---

# SEO Audit

Inspect real pages and hand back a ranked action plan where every item can be proven right or wrong.

## Core Rules

- **Audit rendered pages, not source.** Load each target URL in the chrome-devtools MCP; Liquid, JS, and plugins only resolve at render time.
- **Every finding is falsifiable.** State the observation, the fix, a leading indicator that would confirm the fix worked, and how you would know it failed. A finding with no failure condition is a guess and does not belong in the plan.
- **Prioritize by impact, not by how many boxes are unchecked.** Order Critical → High → Medium → Low. Lead with intent mismatches and indexing blockers — the things that actually decide rankings — not cosmetic nits. A tidy meta description on an unindexable page is worthless.
- **Ground severity in primary sources.** Google Search Central and web.dev are the authority; treat SEO-blog "ranking factor" claims as leads to verify, not facts.

## Workflow

1. Pick target URLs (from `.seo/BRIEF.md`, the sitemap, or the user).
2. For each URL, check:
   - **Indexability & technical** — status, robots, canonical, sitemap, redirects, and mobile rendering.
   - **On-page & structured data** — title, meta, one H1, headings, answer-first intro, internal links, alt text, and JSON-LD.
   - **Core Web Vitals** — LCP, INP, and CLS using field data first, then a lab trace.
   - **AI-search readiness** — answer-first structure, cited facts, and crawler access.
3. Aggregate into `.seo/AUDIT.md` and present the top few items first.

## Output

```markdown
# SEO Audit — <site/date>

## Snapshot

Indexable: X/Y pages · CWV field: LCP _ / INP _ / CLS _ · Structured data: present/absent · AI crawlers: allowed/blocked

## Findings (Critical → Low)

### [Critical] <finding>

- **Observation**: what is wrong, on which URL, with the evidence (status code, DOM value, trace).
- **Fix**: the concrete change.
- **Confirms it worked**: the leading indicator (e.g. "URL Inspection flips to Indexed", "LCP field drops below 2.5s", "snippet impressions rise in Search Console").
- **Would mean it failed**: the observation that says the diagnosis was wrong.

### [High] ...
```

Present the plan ordered, with the one or two changes that actually move the needle at the top.
