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

Keep prose tight and technical. Give the screenshot a descriptive `alt`. Prefer a framed PNG (see `scripts/frame-screenshot.sh`) over a raw terminal grab.

**Good tagline:**

```md
A Neovim plugin that renders [annotaterb](https://github.com/drwl/annotaterb)
schema comments as **boxed, colored sections**.
```

**Bad tagline:**

```md
This is a plugin. It does some rendering of comments.
```

## LICENSE

Write the actual license text. For MIT, fill the year and holder from `git config` and any existing source header. If headers already assert a year, keep it rather than bumping to the current year.

## Contributing

For a small project, a short README section beats a ceremony-heavy `CONTRIBUTING.md`: where the code lives, that there's no build step (or the one command there is), and "open an issue or PR." Add a separate file only when the process genuinely needs it.

## CI workflows

Put lint/test under `.github/workflows/`. Keep each job to: check out, get the tool, run it in `--check` mode.

- **Trigger** on `push` to the default branch and on `pull_request`.
- **Prefer first-party actions.** `actions/checkout` and official `setup-*` actions are safe. A creator-maintained action (the tool's author publishes it) is acceptable — pin it to a version. For anything else, install with plain commands and system packages so the supply chain is auditable.
- **Pin tool versions** so local formatting and CI agree (a formatter version mismatch turns green into red).

**Install-via-command pattern** (avoids depending on a third-party action):

```yaml
- uses: actions/checkout@v4
- name: Install luacheck
  run: |
    sudo apt-get update
    sudo apt-get install -y lua5.1 liblua5.1-0-dev luarocks
    sudo luarocks install luacheck
- run: luacheck lua
```

Before committing the workflow, reproduce each job locally. When the tool isn't installed, use the runner's base image so the result matches CI:

```bash
docker run --rm -v "$PWD":/repo -w /repo ubuntu:24.04 bash -c '<install and run>'
```

Confirm exit 0 and zero warnings before shipping.

## GitHub metadata

Set description, homepage, and topics with `gh` (the `gh` skill owns the details):

```bash
gh repo edit --description "Render annotaterb in Nvim" --homepage "https://…"
gh repo edit --add-topic ruby,rails,nvim,nvim-plugin
```

Verify with `gh repo view --json description,homepageUrl,repositoryTopics`.
