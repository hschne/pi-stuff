# Content Guide

How to write each artifact in Phase 3. Match the maintainer's house style when they give a sample repo; otherwise use these defaults.

## README

Structure, top to bottom (attention is strongest at the top):

1. **Centered header** — `<div align="center">` with an `# H1` title, a one- or two-line tagline that says what it does and links the upstream tool it builds on, then the framed screenshot at `width="100%"`, then close the `div`.
2. **Install** — the real install spec per package manager, using the actual `owner/repo`. State any version/runtime requirement.
3. **Use** — the minimal call to get it working, plus the manual command(s).
4. **Configuration** — the defaults table/block, copy-pasteable.
5. **How it works** — a few bullets on the mechanism, so readers trust it.
6. **Development / Contributing** — where the code lives, how to run checks, and an invitation to open issues/PRs.
7. **License** — `[MIT](LICENSE) © Holder`.

Keep prose tight and technical. Give the screenshot a descriptive `alt`. Prefer a framed PNG (see `scripts/frame-image.sh`) over a raw terminal grab.

### Getting the screenshot

The capture approach and what to show were decided in Clarify — execute it here. Take it yourself when the project is runnable: drive a browser to the page for a web UI, run the tool in a tmux window on a realistic sample file for a TUI/editor plugin and capture the pane, or launch the app and grab the window. Otherwise use the PNG the maintainer supplied.

Frame the raw grab with `frame-image.sh`:

```bash
bash scripts/frame-image.sh raw.png doc/assets/preview.png \
  --crop --padding 32 --border-radius 26 --border 2
```

Run `frame-image.sh --help` for arguments.

### Social preview

Build the card to the design agreed in Clarify, from a throwaway HTML page screenshotted with Playwright (HTML gives cleaner type and lets the screenshot bleed off the page edge).

1. **Write a throwaway page** (e.g. `doc/og/index.html`) sized `1280×640` with `overflow: hidden`: the project title, the tagline, and the framed `preview.png` placed below the text so its top shows and the rest flows off the bottom edge (fixed width, `height: auto`, top-only `border-radius`). Reference the image with a relative path.
2. **Let the maintainer review it** before capturing — open it in a browser and confirm the framing, wording, and bleed look right.
3. **Serve it over HTTP** — Playwright blocks the `file:` protocol, so serve the directory holding both the HTML and the image:
   ```bash
   (cd doc && python3 -m http.server 8917 >/dev/null 2>&1 &)
   ```
4. **Screenshot the viewport** with the Playwright browser tools: resize to `1280×640`, navigate to `http://localhost:8917/og/index.html`, then take a viewport screenshot (`fullPage: false`, `scale: css`) so the PNG is exactly `1280×640`. Save to `doc/assets/og.png` and stop the server.

**Setting it: there is no GitHub API or `gh` command for the social preview** (an undocumented internal endpoint exists but needs session cookies and isn't worth scripting). Commit the PNG and hand the maintainer the manual step: Settings → General → Social preview → upload. Everything else on the repo (description, topics, homepage) is scriptable via `gh` — only this image isn't.

## Website

Set the repo homepage only when there's a real destination — a docs site, a live demo, or a landing page that adds something the README doesn't.

When one exists, set it with `gh repo edit --homepage <url>` and link it prominently near the top of the README.

## LICENSE

Write the actual license text. For MIT, fill the year and holder from `git config` and any existing source header. If headers already assert a year, keep it rather than bumping to the current year.

## Contributing

For a small project, a short README section beats a ceremony-heavy `CONTRIBUTING.md`. Where the code lives, that there's no build step (or the one command there is), and "open an issue or PR." Add a separate file only when the process genuinely needs it.

## CI workflows

Put lint/test under `.github/workflows/`.

- **Trigger** on `push` to the default branch and on `pull_request`.
- **Prefer first-party actions.** `actions/checkout` and official `setup-*` actions are safe. A creator-maintained action (the tool's author publishes it) is acceptable — pin it to a version. For anything else, use plain commands and system packages.
- **Pin tool versions** so local formatting and CI agree.

## GitHub metadata

Set description, homepage, and topics with `gh repo edit`.
