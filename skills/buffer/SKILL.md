---
name: buffer
description: Manage social posts through Buffer MCP. Use when saving drafts, queueing, scheduling, publishing, editing, deleting, or verifying Buffer posts; discovering Buffer organizations and channels; or reviewing queue state and post results.
---

# Buffer Publishing

Execute Buffer operations against explicitly discovered organizations and channels, with approval before mutations and read-back verification afterward.

## Core Rules

- Call `buffer_get_account` first and state the selected organization by name.
- If more than one organization is available and the target is not established, ask which one to use.
- Discover channel IDs with `buffer_list_channels`; never guess or reuse IDs from another workflow.
- Use `buffer_get_channel` before scheduling to inspect its timezone, queue, service metadata, and posting schedule.
- Treat create, edit, delete, and immediate publish actions as approval-gated mutations.
- For approved copy, use the human-reviewed source rather than reconstructing text from conversation.
- Stop on the first failed mutation and report the exact partial state.

## Discover the Target

1. Call `buffer_get_account` and record its `currentTime`, account timezone, organizations, and available plan limits.
2. Select the organization by explicit user choice or established task context. Tell the user its name.
3. Call `buffer_list_channels` for that organization.
4. Match requested platforms and account identities to exact connected channel IDs. Surface ambiguous or disconnected channels.
5. Call `buffer_get_channel` for every selected channel.

Completion: the organization and every target channel are identified by returned IDs, names, and services.

## Inspect Existing Posts

Use `buffer_list_posts` with the narrowest useful organization, channel, status, and date filters. Paginate when the complete matching set affects a decision.

Before adding posts, inspect scheduled posts when queue or plan capacity matters. Derive capacity from current account/channel data; do not assume a universal Buffer limit.

Use `buffer_get_post` for details of one post. Request metrics only when the user asks about performance.

## Prepare Assets

Buffer asset URLs must be remotely fetchable. Before proposing a mutation:

- fetch each URL and verify that it returns the intended media;
- include image alt text in `assets[].image.metadata.altText`;
- use the top-level asset shape required by `buffer_create_post`;
- inspect `buffer_get_channel` metadata for service-specific requirements such as Pinterest boards.

Do not upload local files as part of this skill. Obtain an approved public URL through the project's uploader or the Cloudflare R2 workflow first.

## Choose Scheduling Behavior

Default to `mode: addToQueue` unless the user requests another behavior.

- `addToQueue`: use the channel's configured posting schedule.
- `shareNow`: publish immediately.
- `shareNext`: place the post next in the queue.
- `customScheduled`: set an explicit future `dueAt`.

For explicit times:

1. Interpret local times using the account timezone unless the approved source specifies another timezone.
2. Use `currentTime` from `buffer_get_account` to resolve relative dates and confirm the time is in the future.
3. Send `dueAt` as ISO 8601 with the correct UTC offset. Never silently convert an intended local time to UTC.

Use `schedulingType: automatic` unless the target service or user explicitly requires notification publishing.

## Approval Gate

Before any mutation, present:

- organization and exact channel;
- action, scheduling type, and mode;
- exact text;
- local time, timezone, offset, and `dueAt` when scheduled;
- asset URLs and alt text;
- service-specific metadata;
- relevant queue or plan capacity.

Ask for explicit approval. Earlier copy, image, or campaign approval does not authorize the Buffer operation.

## Create and Verify Posts

1. Re-read the approved source immediately before creating posts.
2. Call `buffer_create_post` once per approved channel using its exact ID.
3. When creating threads, follow the tool schema: include all items, set both outer text and the platform thread metadata, and make outer text match the first item.
4. If a call fails, stop without attempting later posts. Report successful post IDs and the first failure.
5. Call `buffer_get_post` for each created ID.
6. Compare channel, text, scheduling details, status, assets, alt text where returned, and service metadata with the approved plan.

Completion: every created post matches the approved plan on read-back, or the exact partial state and residual differences are reported.

## Edit or Delete Posts

1. Discover the post with `buffer_list_posts` and inspect it with `buffer_get_post`.
2. Present the current value, proposed change, organization, channel, and post ID.
3. Obtain explicit approval for the edit or deletion.
4. Perform the mutation, then read back the post or list the surrounding posts to verify the result.

For operations without a dedicated tool, inspect the Buffer GraphQL schema before using a generic query or mutation. Do not guess schema fields.
