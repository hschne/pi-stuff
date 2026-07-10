# Release-Readiness Checklist

What to inventory in Phase 1. Mark each item present / missing / inconsistent.

## Universal

- **README** — exists, and its install/usage instructions reference the real repo URL (not a placeholder like `dir = "/path/to/..."` or `yourname/repo`). Cross-check every documented command against what the code actually defines; drop references to removed commands.
- **LICENSE** — a real file at the repo root. If source headers claim a license ("MIT License Copyright …") but no file exists, that's an inconsistency to fix. Infer the holder from `git config user.name` / `user.email`.
- **Description + topics** — set on GitHub (`gh repo view --json description,repositoryTopics`).
- **Contributing** — at minimum a short section in the README; a separate `CONTRIBUTING.md` only if the project warrants it.
- **.gitignore** — covers build artifacts, logs, and editor/LSP dirs.
- **Stray files** — fixtures, scratch scripts, `*.log`, editor state in the repo root. Move fixtures under a `doc/`, `fixtures/`, or `examples/` dir; remove logs.
- **CI** — a lint/test workflow if the stack has linters or tests worth enforcing. Optional for a trivial single-file project; surface it rather than forcing it.
- **Tags/releases** — note whether any exist (`git tag`, `gh release list`). Don't create them unprompted; they gate Phase 4.
- **Publishing** — note whether the project is (or should be) on a package registry, and whether the manifest is configured for it. Registry publish is opt-in.
- **Secrets in history** — before a private repo goes public, scan the working tree _and_ git history for committed credentials; a clean current tree can still leak via old commits.

## Also consider

Lighter-weight items worth surfacing; add the ones that fit the project rather than all of them:

- **CHANGELOG.md** + a stated versioning scheme (SemVer) once releases start.
- **README badges** — CI status, latest version, license.
- **Dependency automation** — `.github/dependabot.yml` or renovate.
- **Community health** — `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue/PR templates under `.github/`.
- **Discoverability** — homepage URL and a social-preview image on GitHub.
- **Manifest parity** — the package manifest's repository URL, license field, and keywords match the actual repo and GitHub metadata.
- **Reproducibility** — committed lockfile and an `.editorconfig`.

## By project type

Detect via the manifest, then apply the type-specific items.

| Type           | Manifest signal                 | Extra items to check                                                                                                   |
| -------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Neovim plugin  | `lua/<mod>/init.lua`, `plugin/` | Module/repo/command names consistent; `doc/*.txt` help + `:helptags`; `setup()` documented; lint via stylua + luacheck |
| Ruby gem       | `*.gemspec`                     | Version constant; `bin/`/`exe/`; `bundle exec rake`; RuboCop; `gem build` succeeds                                     |
| Node package   | `package.json`                  | `name`/`version`/`main`/`exports`/`files`; `bin`; scripts for `lint`/`test`/`build`; `.npmignore` or `files`           |
| Go module      | `go.mod`                        | Module path matches repo URL; `go vet`, `go build ./...`; `go test ./...`                                              |
| Rust crate     | `Cargo.toml`                    | `[package]` metadata (description, license, repository); `cargo clippy`, `cargo test`                                  |
| Python package | `pyproject.toml`                | Project metadata + license; `ruff`/`pytest`; build backend configured                                                  |

## Naming consistency

A common release blocker: the repo name, the importable module/package name, and the user-facing command drift apart (e.g. repo `annotaterb.nvim`, module `render-annotaterb`, command `:RenderAnnotaterb`). Flag mismatches and propose one consistent name. Renaming touches every file (source, `plugin/`, `doc/`, autocommand groups, help tags) — surface it as a decision rather than doing it silently.
