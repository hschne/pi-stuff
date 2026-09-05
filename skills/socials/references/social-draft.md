# Social Draft

Save drafts under:

```text
~/Documents/Wiki/areas/writing/social/YY-MM-DD-<topic>.md
```

The document may contain one post, several platform variants, or several dated items. Keep it readable and include only fields the task needs.

## One Post

```markdown
# [Descriptive title]

## LinkedIn

[Exact post copy]
```

A platform heading may include its publication date:

```markdown
## X (DD/MM/YYYY)

[Exact post copy]
```

## Platform Variants

```markdown
# [Descriptive title]

**Publish:** DD/MM/YYYY, HH:MM Europe/Vienna
**Image:** `/absolute/or/project-relative/image.png`
**Public image:** `https://...`
**Alt text:** [Concise description of meaningful image content]

## X

[Exact X copy]

## Bluesky

[Exact Bluesky copy]

## LinkedIn

[Exact LinkedIn copy]
```

## Several Items

```markdown
# [Campaign title]

## [Item] (DD/MM/YYYY)

**Image:** `path/to/image.png`
**Public image:** `https://...`
**Alt text:** [Alt text]

### X

[Exact copy]

### Bluesky

[Exact copy]

### LinkedIn

[Exact copy]
```

Each item may use different platforms, times, and media. Do not add empty platform sections.

## Publishing Receipt

After publishing, append a compact record without changing the approved copy:

```markdown
## Publishing

- Organization: [Buffer organization]
- [Platform]: [post ID] - [scheduled/sent status and observed time]
- Verification: [what matched]
- Residual issues: None
```

For several items, put the receipt under each item or use one final section that maps every item and platform unambiguously.

## Content Rules

- The Markdown contains the exact text sent to each platform.
- Preserve confirmed names, links, dates, quotations, and factual claims.
- Put each URL in the copy exactly where it should appear in the published post.
- Use concise alt text that conveys meaningful content rather than decorative styling.
- Record local timezone information for explicit schedules; the date in a heading alone is insufficient for scheduling.
- Mark unresolved details clearly and resolve them before publishing approval.
