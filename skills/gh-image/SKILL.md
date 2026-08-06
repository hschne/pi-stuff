---
name: gh-image
description: "Upload local images, videos, PDFs, logs, and other files to GitHub with `gh image`, then embed the returned attachment in a pull request, issue, comment, or Markdown document. Use when attaching screenshots or files to GitHub content, adding before/after images, or producing a GitHub `user-attachments` URL."
---

# GitHub Image Upload

Upload files with the installed `gh-image` extension and place its output where the user requested.

## Upload

Use an absolute, quoted file path and an explicit repository when the target is known:

```bash
gh image "/absolute/path/to/file.png" --repo owner/repo
```

Multiple paths may be passed in one command. Each successful upload prints one reference to stdout:

- Images: `![name](https://github.com/user-attachments/assets/...)`
- Videos: a bare URL, which GitHub renders as a player
- Other files: `[name](https://github.com/user-attachments/files/...)`

A batch continues after individual failures and exits non-zero if any upload failed. Preserve successful stdout before handling stderr.

## Embed

Capture the reference, then use `--body-file -` to preserve multiline Markdown and shell characters.

Post a PR comment:

```bash
attachment=$(gh image "/absolute/path/to/file.png" --repo owner/repo)
printf '## Screenshots\n\n%s\n' "$attachment" |
  gh pr comment <number> --repo owner/repo --body-file -
```

Append to a PR description:

```bash
attachment=$(gh image "/absolute/path/to/file.png" --repo owner/repo)
body=$(gh pr view <number> --repo owner/repo --json body --jq .body)
printf '%s\n\n## Screenshots\n\n%s\n' "$body" "$attachment" |
  gh pr edit <number> --repo owner/repo --body-file -
```

Use the equivalent `gh issue edit` or `gh issue comment` command for issues. For a new issue, interpolate the upload output into the body passed through `--body-file -`.

## Authentication

Uploads require write access and a GitHub `user_session` cookie. Verify browser-cookie discovery with:

```bash
gh image check-token
```

On this NixOS setup, Firefox profiles live under `~/.config/mozilla/firefox` while the cookie library discovers `~/.mozilla/firefox`. The compatibility symlink is part of the local setup:

```bash
mkdir -p ~/.mozilla
ln -s ~/.config/mozilla/firefox ~/.mozilla/firefox
```

Use `GH_SESSION_TOKEN` only for headless environments. The cookie grants full account access; keep it out of command arguments, logs, and output.

## Verify

Check the target after editing it:

```bash
gh pr view <number> --repo owner/repo --json body --jq .body
gh issue view <number> --repo owner/repo --json body --jq .body
```

Confirm the returned `github.com/user-attachments` reference is present. Private-repository attachments are expected to reject anonymous requests.
