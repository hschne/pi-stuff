---
name: seo-flow
description: Run the full SEO workflow as a guided, interview-first sequence — discover requirements, then keyword research, on-page, technical, performance, and audit. Use when the user wants to improve a site's SEO end to end, be walked through the whole SEO process, start SEO from scratch, or mentions "seo flow" or "full SEO audit and fix". For a single focused task, the seo-keywords, seo-onpage, seo-technical, seo-performance, or seo-audit skills handle it directly.
---

This skill orchestrates the full SEO workflow by running each phase in sequence. You are a guide walking the user through each phase. Do not rush. Requirements come first — most SEO work fails because someone optimized a page before deciding what query it should win, for whom. Each phase must be completed and confirmed before moving to the next.

## Example prompts

- "Run the full SEO flow for this site"
- "Walk me through SEO from scratch"
- "Improve my site's search ranking end to end"
- "Full SEO audit and fix"

## The Sequence

```
1. Discover      → Grill out requirements, capture the brief
2. Keywords      → Choose targets, map intent to pages
3. On-page       → Titles, meta, headings, schema, AI-search
4. Technical     → Crawlability, indexing, canonicals, sitemap
5. Performance   → Core Web Vitals (LCP, INP, CLS)
—
6. Audit         → Run separately when there are pages to check
```

## Rules

1. **At the start**, tell the user what the full sequence looks like (phases 1-5, with audit available separately) and ask if they want to skip any. Common skip patterns:
   - Already know the target keywords → skip Keywords
   - Tuning one existing page, not the site → skip Technical
   - Static site with no measured speed problem → skip Performance
   - Just want a health check → jump straight to Audit

2. **Before each phase**, announce which phase you are entering and what it produces. Example: "Phase 2: Keywords. I'll research targets and produce `.seo/KEYWORDS.md` mapping each keyword-cluster to a page. Ready?"

3. **During each phase**, read the corresponding SKILL.md and follow its full instructions. Do not summarize or abbreviate it. Run it properly.

4. **After each phase**, summarize what was produced (file name, key decisions, open questions) and ask: "Ready to move to the next phase?" Wait for confirmation.

5. **Between phases**, check whether the previous output changes the next phase. The Keywords map decides which pages On-page touches; the brief's constraints (static site, no JS, what's editable) narrow every later phase.

6. **The user can stop at any point.** If they say "that's enough," summarize where they are in the sequence and what the next phase would be on return.

## Phase Details

### Phase 1: Discover

Read the `grill-me` skill at `~/.pi/agent/skills/grill-me/SKILL.md` and follow it to resolve the requirements. Grill until you have concrete answers to:

- **Goal** — organic clicks, AI-search citations, a specific query, or local visibility? Pick the primary one.
- **Target pages** and the topic/query each should win.
- **Audience** and the job they are trying to do when they search.
- **Current state** — existing traffic, Search Console access, known problems.
- **Constraints** — platform/CMS, what is actually editable, whether the site is static or JS-rendered, publishing cadence.
- **Competitors** — who currently ranks for the targets.

Then write `.seo/BRIEF.md`:

```markdown
# SEO Brief

## Goal

[The one primary outcome. Traffic / AI citations / a query / local.]

## Targets

| Page (URL or path) | Topic / query it should win | Intent |
| ------------------ | --------------------------- | ------ |

## Audience

Who searches, and the job they are doing.

## Current state

Traffic, Search Console access, known issues.

## Constraints

Platform, what is editable, static vs JS-rendered, cadence.

## Competitors

Who ranks for the targets today.

## Success metric

The single number that tells us this worked.
```

**Produces**: `.seo/BRIEF.md`.
**Transition**: "The brief is saved. Next is Keywords, where we choose what to target and map intent to pages. Skip if you already know your keywords. Continue?"

### Phase 2: Keywords

Read `~/.pi/agent/skills/seo-keywords/SKILL.md` and follow it.
**Produces**: `.seo/KEYWORDS.md` — keyword-cluster → page map with intent and SERP notes.
**Transition**: "Targets are mapped. Next, On-page: titles, meta, headings, and schema for those pages. Continue?"

### Phase 3: On-page

Read `~/.pi/agent/skills/seo-onpage/SKILL.md` and follow it for each target page.
**Produces**: Edited pages (metadata, headings, intro, internal links, structured data).
**Transition**: "On-page is done. Next, Technical: making sure those pages can be crawled and indexed. Continue?"

### Phase 4: Technical

Read `~/.pi/agent/skills/seo-technical/SKILL.md` and follow it.
**Produces**: Fixes to robots, sitemap, canonicals, indexability, redirects.
**Transition**: "Technical is clean. Next, Performance: Core Web Vitals. Continue?"

### Phase 5: Performance

Read `~/.pi/agent/skills/seo-performance/SKILL.md` and follow it.
**Produces**: Core Web Vitals fixes (LCP, INP, CLS).
**Transition**: "The flow is complete. Brief and keyword map are saved under `.seo/`. When you want a scored review of the live pages, run the audit and I'll check them against the brief."

**The flow ends here.** Phase 6 is not automatic.

### Phase 6: Audit (on request only)

Runs only when the user asks, and only when there are built or live pages to inspect. Read `~/.pi/agent/skills/seo-audit/SKILL.md` and follow it.
**Produces**: `.seo/AUDIT.md` — prioritized, falsifiable action plan.

## Artifacts

All flow artifacts live under `.seo/` at the project root:

```
.seo/
├── BRIEF.md      ← Phase 1: goal, targets, audience, constraints
├── KEYWORDS.md   ← Phase 2: keyword-cluster → page map
└── AUDIT.md      ← Phase 6: prioritized findings against the brief
```

## If the User Returns Mid-Flow

Check `.seo/` for existing artifacts. If `BRIEF.md` or `KEYWORDS.md` exist, read them to see where they left off, and resume from the next incomplete phase.
