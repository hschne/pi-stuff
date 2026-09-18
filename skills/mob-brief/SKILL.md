---
name: mob-brief
description: Morning brief for Hans — what to look at, investigate, or work on next. Gathers team sigma PR activity on GitHub, Mattermost messages needing attention, his mob lackeys, and his open PRs. Use when asked for a morning brief, daily brief, or what's new.
---

# Morning Brief

The sources are independent. Gather them in parallel, then present the brief.

## Gather

Team sigma: `fractaledmind` (Stephen Margheim), `codenamev` (Valentino Stoll), `fulf` (Sorin Guga), `hschne` (Hans).

```bash
scripts/github fractaledmind codenamev fulf hschne
scripts/mattermost town-square
scripts/lackeys
scripts/github --open hschne
```

Each script's `--help` lists its knobs, including `--since` when Hans asks for a longer window.

`scripts/lackeys` replays mob's own state logs, so it sees retired lackeys and lackeys `mob list` has lost when the scope hash changed. Never substitute `mob list`.

## Judge

- GitHub: keep PRs relevant to Hans — the subsystems work, or something touching what he owns. Drop routine noise.
- Mattermost: keep posts by sebastian, obie, or brandon — especially briefs they shared — plus anything else Hans plausibly hasn't seen and would care about. Unread DMs pass through as-is. Load the `mattermost` skill to pull a full thread when context is missing.
- Lackeys: report every line — no filtering.

## Output

A terse brief in three sections. Every item carries its full URL. Drop each script's leading `window:` line. State outright when a section is empty.

**News** — Mattermost, no PR activity here.

**GitHub** — PRs opened or merged in the window.

**Board** — Hans's work in flight as the `mob-report` table, then his open PRs. Below it, name anything retired since the window that is not already on the table.

Lead with what waits on Hans — a failing or passing-and-unreviewed PR, a lackey reporting `blocked` or `done`, or a `gone` lackey.
