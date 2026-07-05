---
name: seo-keywords
description: Research and choose SEO keywords by mapping search intent to pages. Use for keyword research, deciding what to target or rank for, classifying search intent, building a keyword-to-page map, planning topic clusters, or analyzing the live SERP for a query.
---

# SEO Keywords

Choose what each page should win, driven by search intent — not by volume.

## Core Rules

- **Intent is the filter that matters most.** For every candidate, decide what job the searcher wants done: a definition (informational), a comparison or "best X" (commercial), a purchase/signup (transactional), or a specific site (navigational). A page that targets the wrong intent cannot rank no matter how good it is. Match keyword intent to page type before anything else.
- **Read the live SERP before committing to a target.** Google's current top ~5 results tell you the format it rewards — listicle, tool, definition, video, product grid. If the page you can build does not match that format, pick a different keyword. This single check prevents most wasted content.
- **One primary keyword-cluster per page.** Group synonyms and close subtopics that share one intent onto one page; spreading the same intent across two pages makes them cannibalize each other and split ranking signals.
- **Volume and difficulty are secondary and imprecise.** Use them for relative comparison, not as truth. For a new or low-authority site, favor lower-difficulty long-tail terms with unambiguous intent over high-volume head terms you cannot win.

## Process

1. **Seeds.** Start from the brief's topics and what the site actually offers. List 5-15 short head-term seeds ("ruby meetup"), not full sentences.
2. **Expand.** Run `bash scripts/suggest.sh "<seed>"` to harvest real long-tail queries from Google autocomplete (no API key). Also mine "People also ask", "Related searches", and competitor headings. If an SEO data tool or MCP is available, use it for volume/difficulty; it is not required.
   - **Owned sites:** if the site is verified in Google Search Console, its Search Analytics API/report is the best source there is — the actual queries the site already gets impressions and clicks for, with position. Prioritize "striking-distance" queries (positions ~5-15) where a small on-page push wins real traffic.
3. **Classify.** For each candidate, tag intent (informational / commercial / transactional / navigational) and note SERP features present: featured snippet, AI Overview, video pack, shopping, local pack. These signal both opportunity and required format.
4. **Judge difficulty by eyeballing the SERP.** Are the top results high-authority, deeply-covered, exact-match? If yes, it is hard — note it. You do not need a numeric score to tell a winnable SERP from an unwinnable one.
5. **Cluster and map.** Group candidates that share intent into clusters, and assign each cluster to exactly one existing or new page.
6. **Write `.seo/KEYWORDS.md`** using the template.

Use the chrome-devtools MCP (`chrome_devtools_navigate_page` + `chrome_devtools_take_snapshot`) to read live SERPs and competitor pages when you need to see what actually ranks.

## Output

```markdown
# Keyword Map

| Page (URL/path) | Primary keyword            | Intent        | Also covers                   | SERP format          | Difficulty | Notes                                                    |
| --------------- | -------------------------- | ------------- | ----------------------------- | -------------------- | ---------- | -------------------------------------------------------- |
| /meetups/       | how to start a ruby meetup | informational | first meetup, finding a venue | how-to guide + steps | med        | AI Overview present; answer-first intro wins the snippet |

## Cannibalization check

Pages competing for the same intent, and how they were split or merged.

## Gaps

Intents with demand but no page yet — candidates for new content.
```

## Scripts

| Script               | Purpose                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| `scripts/suggest.sh` | Expand a short seed into real long-tail queries via Google autocomplete, no API key. `suggest.sh "ruby meetup"` |
