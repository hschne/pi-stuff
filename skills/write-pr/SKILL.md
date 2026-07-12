---
name: write-pr
description: "Write terse pull request titles and bodies. Use when the user wants to create content for a pull request."
---

# Write PR

Produce the PR title and body only. Do not create or modify the pull request.

## Workflow

1. Identify the base and change set. Infer the current branch and default base when possible; ask only when the target is ambiguous.
2. Read the complete diff, commit list, repository instructions, and PR template. Use history only to clarify intent - the diff is authoritative.
3. Account for every meaningful change, then separate reviewer-relevant behavior from incidental implementation detail.
4. Return ready-to-paste Markdown in this form:

```md
Title: <imperative, sentence-case title>

<PR body>
```

## Body

Scale detail to the change:

- Tiny data or maintenance change: one or two concrete sentences.
- Focused fix: explain the symptom and root cause.
- Feature or broad change: brief description, noteworthy implementation decisions, tradeoffs, and exact testing steps.

Follow the repository template, but omit empty or inapplicable sections. Include issue references, migration or deployment notes, screenshots, and follow-ups only when supported by the available context. 

If essential context is missing, add a short `Missing:` note after the draft rather than inventing it.

Use direct, conversational, and specific voice. Use first person for judgment calls, short paragraphs, and bullets where they improve scanning. A dry aside is fine when natural. Prefer concrete nouns and commands over generic claims. 

Before returning, verify that the title describes the outcome, the body matches the diff, and testing instructions contain only commands or steps that can actually be performed.
