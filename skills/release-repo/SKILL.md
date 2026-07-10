---
name: release-repo
description: Make a repository release-ready through a guided survey-then-build workflow. Use when the user wants to prepare a repo for public release, polish a project before publishing or update a repository to match the house-style.
---

# Release Ready

Make a repository publishable by adding various bits and pieces that published tools need. Survey what exists and fill the gaps. You are a guide walking the maintainer through each phase in order.

## Core rules

- **Survey before building.** Read the actual repository and query GitHub for current metadata before proposing changes. Assumptions about what's present waste the maintainer's time and produce wrong edits.
- **Ask only what you can't infer.** Look up facts from the codebase and `gh`. Put genuine decisions (license choice, description wording, release modalities...) to the maintainer, one question at a time, each with a recommended answer.
- **Don't commit or push unless asked.** Stage explicit paths you created.

## The sequence

```
1. Survey    → Inventory what's present vs. missing
2. Clarify   → Ask only for gaps and decisions, one at a time
3. Build     → Create the missing pieces
4. Release   → Set up tagging, releases, and package publishing if requied.
```

Announce each phase before entering it. After Survey and after Build, summarize and confirm before proceeding. 

### Phase 1: Survey

Detect the project type first — it drives what "release-ready".

Inventory the working tree and GitHub state:

```bash
ls -la && git remote -v && git tag
gh repo view --json nameWithOwner,description,homepageUrl,repositoryTopics,licenseInfo,visibility,isTemplate
```

Read the README, any LICENSE, `.github/workflows/`, CONTRIBUTING, and sample the code to gather the nuances of what this product is about. 

Produce a checklist of present vs. missing items and any inconsistencies (e.g. README referencing a command that no longer exists, a placeholder install path, a license header with no LICENSE file). See [checklist](references/checklist.md) for the full item list by project type.

### Phase 2: Clarify

Resolve gaps the codebase can't answer, one question at a time with a recommended default:

- License choice and copyright holder (infer holder from `git config user.name`; infer intended license from source headers if present).
- One-line description and topics for GitHub metadata (propose from the README and code).
- Whether to add CI, and which checks (lint / test / build) fit the stack.
- Whether to cut a release now and whether to publish to a package registry.

Skip questions already answered by the survey. Tagging, releases, and publishing are opt-in — offer them, but don't perform them unprompted.

### Phase 3: Build

Create the missing pieces. Read [content-guide](references/content-guide.md) for how to structure each artifact — README, LICENSE, CONTRIBUTING, and CI workflows with locally-verified tooling.

For a screenshot, frame it so it reads well on GitHub — cropped to content, rounded corners, and a subtle border baked in:

```bash
bash <skill-dir>/scripts/frame-screenshot.sh <raw.png> doc/assets/preview.png
```

The script auto-detects the background, crops to the content bounding box, rounds the corners (transparent outside, so it sits on light or dark GitHub themes), and strokes a subtle grey border. Override with `--radius`, `--border`, `--pad` as needed.

Set the GitHub metadata with `gh` (the `gh` skill owns the mechanics):

```bash
gh repo edit --description "…" --homepage "…"
gh repo edit --add-topic ruby,rails,nvim,nvim-plugin
```

### Phase 4: Release (opt-in)

Only if the maintainer chose to release/publish in Phase 2. Read [publishing](references/publishing.md) for versioning, tagging, release automation, and per-ecosystem publish steps. In short: pick a SemVer version, update the `CHANGELOG.md`, cut the tag + GitHub release, and — if publishing — push to the registry using trusted publishing (OIDC) over long-lived token secrets where the registry supports it. Perform destructive/irreversible steps (pushing a tag, `npm publish`, `gem push`) only on explicit confirmation, since most registries don't allow re-publishing a version.

### Phase 5: Verify

Run each check the way CI runs it and confirm it passes before handing off:

- Formatter/linter in `--check` mode (e.g. `stylua --check .`, `luacheck lua`, `rubocop`).
- For tools not installed locally, run them in the runner's base image: `docker run --rm -v "$PWD":/repo -w /repo <image> <command>`.
- Load/smoke-test the entry point where cheap (e.g. `nvim --headless -c "lua require('mod').setup()" -c qa`).

Report what changed, what's staged, and any residual decisions (tagging, first release, secrets). Leave the commit to the maintainer unless they ask.

## References

Read the reference that matches the current phase:

| Topic         | When to Read                                         | Reference                                    |
| ------------- | ---------------------------------------------------- | -------------------------------------------- |
| checklist     | Phase 1 — what to inventory, by project type         | [checklist](references/checklist.md)         |
| content-guide | Phase 3 — how to write README, LICENSE, CI, metadata | [content-guide](references/content-guide.md) |
| publishing    | Phase 4 — versioning, tagging, releases, publishing  | [publishing](references/publishing.md)       |

## Scripts

| Script                        | Purpose                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `scripts/frame-screenshot.sh` | Crop-to-content + rounded corners + subtle border for a README screenshot (needs ImageMagick). |
