---
name: socials
description: Draft, review, publish, and verify social-media posts through a Markdown-first workflow. Use for one-off posts, platform variants, scheduled campaigns, post promotion, or publishing through Buffer, with optional social images and public media hosting.
---

# Social Posts

Take one post or a multi-post campaign from source material to verified publication. The approved Markdown draft is the source of truth.

## Core Rules

- Write the exact post content in `~/Documents/Wiki/areas/writing/social/` before publishing it.
- Treat drafting and publishing as separate scopes. Approval of copy or media does not authorize a Buffer mutation.
- Adapt copy to each selected platform instead of mechanically truncating one universal version.
- Never invent claims, quotations, links, dates, handles, or engagement.
- Make media conditional. Text-only posts do not need image work or hosting.
- Re-read the approved Markdown immediately before publishing and verify every created post afterward.

## 1. Establish the Post

Determine from the request and available source material:

- the post's subject, purpose, audience, and call to action;
- whether this is a one-off post or several related items;
- target platforms and whether each needs distinct copy;
- publish now, add to queue, save as draft, or schedule at explicit local times;
- required links, tags, mentions, images, video, and alt text.

Ask only for consequential gaps. Do not require campaign metadata for a one-off post.

## 2. Establish the Voice

For Hans's personal accounts, load the `writing` skill and inspect 2-4 relevant recent files from:

```text
~/Documents/Wiki/areas/writing/social/
```

For an organization or project, inspect its prior posts and brand guidance instead. Use the account's established voice; do not impose Hans's first-person voice on organizational copy.

Preserve concrete supplied wording and factual claims. Write directly, without engagement bait or generic promotional filler.

## 3. Create the Markdown Draft

Read the [social draft reference](references/social-draft.md), then create or update a lowercase, dated Markdown file in the socials wiki. Existing documents may keep their current structure if every publishable variant is unambiguous.

Write exact copy for every selected platform. Include local schedule details, media paths, public media URLs, and alt text only when applicable. Clearly mark unresolved fields rather than guessing them.

Run:

```bash
qmd update
```

Then validate supported short-form limits:

```bash
node <skill-dir>/scripts/validate-posts.mjs <draft-file>
```

Revise until validation passes. Present the Markdown path and complete draft for review.

Completion: the Markdown contains the exact intended content and the user has approved the copy and proposed media.

## 4. Prepare Media When Needed

If existing media is already suitable, read it and verify its content and dimensions. If new or modified artwork is required, load the `social-images` skill and obtain visual approval.

Buffer requires remotely fetchable media URLs. Resolve them in this order:

1. Use an already approved public URL.
2. Use the project's documented upload task and read its resulting manifest.
3. If the project has no uploader, load the `cf` skill and its public R2 media reference.

Never assume a Cloudflare account, bucket, domain, or key prefix from another project. Fetch every resulting URL and verify the public object before adding it to the draft.

Update the Markdown with the approved local path, public URL, and concise alt text, then run `qmd update` again.

Completion: each media post has an approved, publicly fetchable asset and alt text.

## 5. Prepare the Publishing Plan

If the user requested drafting only, stop after approval. Otherwise load the `buffer` skill and prepare a plan from the approved Markdown.

The plan must show, for every mutation:

- Buffer organization and exact channel;
- action and scheduling mode;
- local date, time, timezone, and offset when scheduled;
- exact copy;
- public media URL and alt text when present;
- platform validation result;
- queue or plan capacity when relevant.

### Publishing Approval Gate

Ask for explicit approval of the complete mutation plan. Copy approval does not satisfy this gate.

## 6. Publish and Verify

After approval:

1. Re-read the Markdown and ensure the plan still matches it.
2. Publish through Buffer exactly as approved.
3. Stop on the first failure and report successful post IDs plus the failed mutation.
4. Read every created post back and compare its channel, text, schedule, status, and media with the approved plan.
5. Append post IDs, observed status, verification results, and residual issues to the Markdown.
6. Run `qmd update`.

Completion: every approved mutation is read back correctly, or the exact partial state is recorded and reported.

## References

| Topic        | When to Read                            | Reference                                  |
| ------------ | --------------------------------------- | ------------------------------------------ |
| Social draft | Creating or updating the Markdown draft | [social draft](references/social-draft.md) |
