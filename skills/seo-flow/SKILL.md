---
name: seo-flow
description: Run a complete guided SEO workflow from requirements and keyword mapping through on-page, technical, performance, and final audit work. Use when the user wants to improve a site's SEO end to end, start SEO from scratch, or requests a full SEO flow.
---

# SEO Flow

Guide a site from search goals to implemented, verifiable improvements. Complete and confirm each phase before moving on; intent comes before page mechanics.

## Sequence

```text
1. Discover      → define goals, audience, targets, and constraints
2. Keywords      → map search intent and query clusters to pages
3. On-page       → align content, metadata, links, and structured data
4. Technical     → establish crawlability and indexability
5. Performance   → improve Core Web Vitals
—
6. Audit         → run separately against built or live pages
```

## Rules

1. Show phases 1–5 at the start and ask whether any should be skipped. A health check can jump directly to audit; a single-page task may not need site-wide technical work.
2. Before each phase, state its output and ask whether to begin.
3. After each phase, summarize changed files, decisions, evidence, and open questions. Wait for confirmation.
4. Let earlier artifacts constrain later work: query intent determines page content; platform constraints determine implementation.
5. If the user stops, record completed work and the next phase.

## Phase Contracts

### 1. Discover

Resolve one decision at a time, recommending an answer with each question:

- primary outcome: organic clicks, citations, a target query, or local visibility;
- target pages and the job each should satisfy;
- audience and search context;
- current traffic, Search Console access, and known problems;
- platform, editability, rendering model, and publishing constraints;
- competitors currently winning the target searches;
- one measurable success signal.

Save `.seo/BRIEF.md`.

**Complete when:** every target page has an audience, intended query/topic, and measurable outcome.

### 2. Keywords

Research the live results for candidate queries. Classify intent, result format, and competitive fit; cluster queries that should resolve to one page; prevent cannibalization by assigning one primary target per page. Record primary and secondary queries, evidence from current results, content format, and gaps the page can uniquely fill.

Save `.seo/KEYWORDS.md` as a query-cluster-to-page map.

**Complete when:** each target cluster has one owning page and an evidenced intent match.

### 3. On-page

For each mapped page:

- make the opening answer the target intent directly;
- set a unique descriptive title and useful meta description;
- keep one clear H1 and a logical H2/H3 hierarchy;
- add original evidence, first-hand detail, and visible sources where relevant;
- add descriptive internal links and image alt text/dimensions;
- add JSON-LD only when it matches visible content;
- verify the rendered DOM rather than template source.

**Complete when:** each rendered page fulfills the mapped intent and exposes correct metadata and structure.

### 4. Technical

For every target URL, verify HTTP status, robots access, meta robots, canonical URL, sitemap membership, HTTPS, redirect hops, viewport, and mobile content parity. Keep only canonical, indexable 200 URLs in the sitemap and reference it from `robots.txt`.

**Complete when:** each target URL is crawlable, indexable, canonical, and reachable without redirect chains.

### 5. Performance

Use field data when available, then reproduce with a lab trace. Identify the actual LCP element, interaction bottleneck, and layout-shift sources before editing. Prioritize LCP, INP, and CLS changes that affect target pages; remeasure under the same conditions.

**Complete when:** measurements and before/after evidence are recorded, with residual limits stated.

### 6. Audit on Request

Run only against built or live pages when the user asks. Aggregate indexability, intent/on-page, structured-data, Core Web Vitals, and AI-crawler findings into `.seo/AUDIT.md`. Rank Critical → Low. Every finding states the observation, concrete fix, confirming indicator, and failure condition.

**Complete when:** the plan is prioritized and every finding is falsifiable.

## Resume

Artifacts live under `.seo/`. On return, inspect `BRIEF.md`, `KEYWORDS.md`, and `AUDIT.md`, reconcile them with the current site, and resume from the first incomplete phase.
