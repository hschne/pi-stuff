---
name: vrb-event-flow
description: "Run the guided Vienna.rb event preparation, publication, and promotion workflow. Use only when explicitly invoked through /vrb-event-flow."
disable-model-invocation: true
---

# Vienna.rb Event Flow

Prepare one Vienna.rb meetup from brief through verified promotion. Work in phases, persist progress in one human-readable `EVENT.md`, and stop at each approval gate.

## Critical Rules

- Work from `/home/hschne/Source/vienna.rb/assets` regardless of the invocation directory.
- Save durable workflow state at `.agents/.vrb-event-flow/<event-number>/EVENT.md` using the event-file reference.
- Announce each phase and its output before starting it. After each phase, update `EVENT.md`.
- Publishing Meetup/Luma and creating Buffer posts are separate approval-gated mutations.
- Use the visible shared Chromium for Meetup and Luma. If unavailable, start `chromium --remote-debugging-port=9222 &` and proceed. Stop only when authentication is required.
- Use Buffer MCP for account discovery, capacity checks, scheduling, and read-back verification. State the organization name being changed.
- Resume incomplete work by reading `.agents/.vrb-event-flow/*/EVENT.md`, the referenced wiki promotion file, `event.yaml`, and `out/media.json`.

## Phase 1: Event Brief

1. Check for an incomplete `EVENT.md`. Offer to resume it before starting another event.
2. Inspect the previous event and prefill reusable defaults. Ask only for missing or changed facts, one question at a time.
3. Collect and confirm:
   - event number, title, Thursday date, start/end time, and `Europe/Vienna` timezone
   - venue name, address, URL, and access instructions
   - capacity, pricing, organizer contact, agenda, and format changes
   - sponsor name, logo file/URL, and website
   - each speaker's name, avatar file/URL, profile URL, talk title, and talk description
   - additional announcements or campaign requirements
4. Write `.agents/.vrb-event-flow/<event-number>/EVENT.md`. Keep supplied wording and distinguish confirmed facts from drafts.

Completion: every required fact is confirmed and recorded in `EVENT.md`.

## Phase 2: Assets

1. Copy or download speaker avatars and sponsor logos into `images/` using stable lowercase hyphenated names. Preserve originals unless preview exposes a framing problem.
2. Update `event.yaml` only with presentation data used by the asset renderer: number, display date, sponsor image path, speaker name, talk title, and photo path.
3. Start `mise run preview` as a long-running process and open the `.render/*.html` pages at `http://localhost:4321` in visible Chromium.
4. Ask the user to review every event and speaker variant. Apply requested changes through the hot-reloading preview.
5. After visual approval, run:

```bash
mise run generate
mise run lint
```

6. Record generated paths in `EVENT.md`.

Completion: the user explicitly approves every generated asset and checks pass.

## Phase 3: Provisional Promotion

1. Read the writing and wiki skills.
2. Create `~/Documents/Wiki/areas/writing/social/YY-MM-DD-vienna-rb-<event-number>-promotion.md` using the promotion reference.
3. Generate this standard campaign:
   1. event announcement
   2. one speaker spotlight per speaker, in agenda order
   3. one-week reminder
   4. sponsor/venue thank-you
4. Assign campaign dates:
   - announcement: earliest weekday on which all three platform times are still in the future
   - speaker spotlights: evenly spaced weekdays after the announcement and before the reminder
   - reminder: the Thursday exactly one week before the event
   - sponsor/venue thank-you: Monday of event week
   - if there are too few weekdays, stop and ask rather than stacking campaign items
5. Use `Europe/Vienna` and stagger each campaign item:
   - X: 10:00
   - Bluesky: 12:00
   - LinkedIn: 14:00
6. Write exact variants for X, Bluesky, and LinkedIn. X is a single post with the Meetup RSVP link only; do not create threads. Bluesky and LinkedIn include Meetup and Luma links once available.
7. Pair speaker spotlights with that speaker's talk cover. Pair announcement, reminder, and sponsor/venue posts with `event-2100x1200.png`.
8. Include concise alt text for every image.
9. Run `qmd update` and record the wiki path in `EVENT.md`.

### Approval Gate 1

Ask the user to approve the generated assets and provisional promotion Markdown. Continue only after explicit approval.

## Phase 4: Meetup and Luma

1. Read the browser skill and use `playwright-live` so the user can inspect the real browser.
2. Open separate Meetup and Luma creation tabs. Populate both from `EVENT.md`; the brief is canonical, not either platform.
3. Fill Meetup first with `out/event-2100x1200.png`.
4. Fill Luma separately with `out/event-2100x2100.png`. Use its rich-text editor rather than pasting Markdown or Meetup separators. Create real headings, emphasis, dividers, and links.
5. Preserve venue access instructions on both platforms.
6. Stop before the final create/publish controls and leave both forms visible.

### Approval Gate 2

Ask the user to inspect both forms. After explicit approval, publish Meetup first and then Luma. Record both live URLs and platform IDs in `EVENT.md`. If either action fails, stop and report the exact partial state.

## Phase 5: Final Campaign Review

1. Insert the live Meetup and Luma URLs into every platform variant in the wiki document.
2. Run the bundled validator:

```bash
node /home/hschne/.pi/agent/skills/vrb-event-flow/scripts/validate-social.mjs <promotion-file>
```

3. Revise until every X post is within its weighted 280-character limit and every Bluesky post is within 300 graphemes and 3,000 UTF-8 bytes.
4. Run `mise run upload`. Read `out/media.json` and map each approved post to its content-addressed public R2 image URL.
5. Use Buffer MCP `get_account`, `list_channels`, and `list_posts` to identify the organization, exact X/Bluesky/LinkedIn channel IDs, and existing scheduled count per channel.
6. Confirm the full campaign fits within Buffer's 10-scheduled-post limit on every channel. If any channel lacks capacity, stop before creating anything.
7. Present the complete mutation plan: exact copy, local time, channel, image, alt text, character usage, and resulting capacity. Update `EVENT.md`.

### Approval Gate 3

Ask for explicit approval to create the complete Buffer campaign. Approval of earlier phases does not authorize scheduling.

## Phase 6: Schedule and Verify

1. Re-read the approved wiki document immediately before mutation.
2. Create every post with Buffer MCP using:
   - the exact discovered channel ID
   - `schedulingType: automatic`
   - `mode: customScheduled`
   - ISO 8601 `dueAt` with the correct Vienna offset
   - the mapped R2 image URL and approved alt text
3. If any creation fails, stop. Report created post IDs and the first failure; do not silently continue into a partial campaign.
4. Read scheduled posts back through Buffer MCP. Compare every post's channel, time, text, image, alt text where returned, and status against the approved plan.
5. Record post IDs, verification results, completion, and residual issues in `EVENT.md`.

Completion: Meetup and Luma are live, every approved social post is scheduled and read back correctly, and `EVENT.md` records the final state.

## References

Read each reference when its phase begins:

| Topic       | When to Read                     | Reference                                   |
| ----------- | -------------------------------- | ------------------------------------------- |
| Event state | Creating or resuming `EVENT.md`  | [event file](references/event-file.md)      |
| Promotion   | Writing or reviewing social copy | [promotion format](references/promotion.md) |
