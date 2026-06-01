## Parent

`.agents/PRD.md` — pi-patrol PRD

## What to build

Create the local pi-patrol extension skeleton and make it load patrol configuration from the correct location. A developer should be able to install or enable the local extension, add either a project config or global fallback config, and have pi-patrol resolve exactly one config without merging.

## Acceptance criteria

- [ ] The local extension lives under `extensions/pi-patrol/` and can be loaded by Pi as a local extension.
- [ ] pi-patrol looks for project config at `.pi/patrol.json` relative to the active project.
- [ ] pi-patrol falls back to `~/.pi/agent/patrol.json` when no project config exists.
- [ ] A project config overrides the global config entirely; fields are not merged.
- [ ] Config supports `commands`, `retry`, and `timeout` with a default timeout of `15000` ms and default retry of `false`.
- [ ] Missing config disables pi-patrol without sending conversation messages or triggering turns.
- [ ] Invalid config fails safely with a clear UI notification or visible warning, without triggering a repair turn.
- [ ] Verified in a live Pi instance against the test project at `/tmp/pi-patrol-test/`; the extension loads from the local path and resolves project, global fallback, missing, and invalid configs without crashing Pi.

## Assets

- `.agents/PRD.md` — source requirements for config shape and local extension layout.
- https://github.com/Vahor/pi-extensions/tree/main/packages/pi-hooks — reference for config-driven Pi extension loading.
- `/tmp/pi-patrol-test/` — dummy bash project with ShellCheck config at `.pi/patrol.json` and a clean `scripts/hello.sh`.

## Blocked by

None - can start immediately
