# Publishing Guide

Phase 4 — versioning, tagging, releases, and registry publishing. Confirm each destructive step with the maintainer before running it.

## 1. Version

Pick a [SemVer](https://semver.org/) version. For a first public cut, `0.1.0` signals "usable, API may still move"; `1.0.0` signals a stable API.

Set the version in the one place that ecosystem reads it, and keep it in sync with the tag.

## 2. Tag + GitHub release

Confirm the version and changelog first, then:

```bash
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
gh release create v0.1.0 --title "v0.1.0" --notes-file <(sed -n '/## \[0.1.0\]/,/## \[/p' CHANGELOG.md)
# attach build artifacts when relevant:
gh release create v0.1.0 ./dist/*.tar.gz --title "v0.1.0" --notes "…"
```

## 4. Publish to a registry

Prefer **trusted publishing (OIDC)** over long-lived token secrets where the registry supports it — the CI job authenticates via short-lived GitHub identity, so there's no API key to leak or rotate.

Dry-run before the real push where the tool allows it. Verify the manifest's `repository`, `license`, and file-inclusion list are correct so the published package isn't missing files or pointing at the wrong repo.

## 5. Automate

A tag-triggered workflow makes releases repeatable — it fires on `push` of a `v*` tag, builds, and publishes. Use OIDC (`permissions: id-token: write`) instead of storing registry tokens where the registry supports it. 
