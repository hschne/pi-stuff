# Publishing Guide

Phase 4 — versioning, tagging, GitHub releases, and registry publishing. All of this is opt-in and mostly irreversible: most registries reject re-publishing a version, and a pushed tag is public immediately. Confirm each destructive step with the maintainer before running it.

## 1. Version

Pick a [SemVer](https://semver.org/) version. For a first public cut, `0.1.0` signals "usable, API may still move"; `1.0.0` signals a stable API.

Set the version in the one place that ecosystem reads it, and keep it in sync with the tag:

| Ecosystem | Version source                         |
| --------- | -------------------------------------- |
| Node      | `package.json` `version`               |
| Ruby gem  | `lib/<gem>/version.rb` constant        |
| Rust      | `Cargo.toml` `[package] version`       |
| Python    | `pyproject.toml` `[project] version`   |
| Go        | the git tag only (no manifest field)   |
| Nvim/Lua  | the git tag only (managers track tags) |

## 2. Changelog

Keep a `CHANGELOG.md` in [Keep a Changelog](https://keepachangelog.com/) form: an `## [Unreleased]` section during development, promoted to `## [x.y.z] - DATE` at release. The release notes for the GitHub release come straight from this.

## 3. Tag + GitHub release

Confirm the version and changelog first, then:

```bash
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
gh release create v0.1.0 --title "v0.1.0" --notes-file <(sed -n '/## \[0.1.0\]/,/## \[/p' CHANGELOG.md)
# attach build artifacts when relevant:
gh release create v0.1.0 ./dist/*.tar.gz --title "v0.1.0" --notes "…"
```

For Go modules and most Neovim/Lua plugins, the tag _is_ the release — users pin to it directly; no registry step follows.

## 4. Publish to a registry (when applicable)

Prefer **trusted publishing (OIDC)** over long-lived token secrets where the registry supports it — the CI job authenticates via short-lived GitHub identity, so there's no API key to leak or rotate.

| Registry  | Command                                  | Auth                                                                  |
| --------- | ---------------------------------------- | --------------------------------------------------------------------- |
| npm       | `npm publish`                            | OIDC trusted publisher, or `NODE_AUTH_TOKEN` secret                   |
| RubyGems  | `gem push <gem>.gem`                     | OIDC trusted publishing, or `~/.gem/credentials` / `RUBYGEMS_API_KEY` |
| crates.io | `cargo publish`                          | `CARGO_REGISTRY_TOKEN` secret                                         |
| PyPI      | `python -m build && twine upload dist/*` | OIDC trusted publisher (preferred), or `PYPI_API_TOKEN`               |
| LuaRocks  | `luarocks upload <rockspec>`             | LuaRocks API key                                                      |

Dry-run before the real push where the tool allows it (`npm publish --dry-run`, `gem build` + inspect, `cargo publish --dry-run`, `twine check`). Verify the manifest's `repository`, `license`, and file-inclusion list are correct so the published package isn't missing files or pointing at the wrong repo.

## 5. Automate (optional)

A tag-triggered workflow makes releases repeatable — it fires on `push` of a `v*` tag, builds, and publishes. Use OIDC (`permissions: id-token: write`) instead of storing registry tokens where the registry supports it. Verify the build steps locally (or in the runner image) before wiring the publish step, and gate the first automated publish behind a manual confirmation since it can't be undone.
