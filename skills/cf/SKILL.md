---
name: cf
description: Use the Cloudflare `cf` CLI and Local Explorer safely. Trigger when using `cf`, Cloudflare CLI, Wrangler, Cloudflare Local Explorer, D1/KV/R2/Durable Objects/Workflows, account/zone/DNS management, or uploading publicly hosted media to Cloudflare R2.
---

# Cloudflare cf CLI

Use `cf` for Cloudflare API operations and local resource simulations. This guidance targets `cf` 0.9.0.

## Core Rules

- Run `cf --version` first. If it is not 0.9.x, inspect current help before following version-specific commands.
- Treat `cf` auth as secret-bearing. Do not read, copy, summarize, or commit credential files reported by `cf auth whoami`.
- Prefer discovery over guessing. `cf` is generated and still a technical preview, so command shapes can vary by product.
- Distinguish remote and local operations explicitly. Default commands hit Cloudflare remote APIs; local simulations require `--local` and may share state through `--persist-to`.
- Use `--dry-run` before mutating resources when the command supports it.

## Discovery Commands

Start with these before constructing a command:

```bash
cf --help
cf <product> --help
cf <product> <resource> --help
cf schema --list
cf schema <command...>
cf agent-context --list
cf agent-context <product>
```

Notes:

- `cf agent-context --list` shows generated products that may not appear in top-level help.
- `cf schema <command...>` maps CLI commands to HTTP method, API path, params, and request-body support.
- If a command exposes `--body`, pass compact JSON rather than hand-building complex flag sets:

```bash
cf dns records create -z example.com --dry-run --body '{"type":"A","name":"www","content":"203.0.113.10","ttl":1,"proxied":true}'
```

## Authentication and Target Selection

Inspect authentication and named profiles without reading credential files:

```bash
cf auth whoami
cf auth list
```

Use `cf auth login` for the default profile. For separate identities, use `cf auth create <name>`, then select one per command with `--profile <name>` or bind it to a directory with `cf auth activate <name> [dir]`. Profile creation, activation, deletion, and logout change local authentication configuration; perform them only when requested.

A profile may still expose several Cloudflare accounts. `cf auth whoami` reports their IDs without exposing the token. When more than one account is available, select the intended account explicitly:

```bash
CLOUDFLARE_ACCOUNT_ID=<account-id> cf <command...>
```

Keep `CLOUDFLARE_ACCOUNT_ID` on every command in that operation. Use `-z <zone-or-zone-id>` or `CLOUDFLARE_ZONE_ID` when a command needs zone context. Confirm selection with a read-only command against the intended resource.

`CLOUDFLARE_API_TOKEN` takes precedence over OAuth profiles. Let `cf auth whoami` identify the active credential source; do not inspect the underlying file.

## Local Resource Simulations

In 0.9.x, `--local` operates on local simulated resources without a Local Explorer endpoint. Use `--persist-to <directory>` when separate commands or processes must share the same local state:

```bash
cf <product> <command...> --local --persist-to <state-directory>
```

Example:

```bash
cf r2 buckets list --local --persist-to .wrangler/state
```

The default persistence directory is `~/.config/cloudflare/state`. Prefer a project-local path when the simulated state belongs to one project. In 0.9.0, a local command may print its complete result but keep the simulator process alive; after confirming complete output, interrupt it rather than waiting indefinitely. Local changes do not affect remote Cloudflare resources.

## Safety Checklist Before Mutations

1. Run the command with `--help` and confirm required params.
2. Confirm the target account with `cf auth whoami`, then pass `CLOUDFLARE_ACCOUNT_ID` explicitly when multiple accounts are available.
3. Add `--local` and, when state must persist across commands, `--persist-to <directory>` for local simulations.
4. Use `--dry-run` if available.
5. Keep command output free of tokens and secret values.

## References

| Topic           | When to Read                                   | Reference                                        |
| --------------- | ---------------------------------------------- | ------------------------------------------------ |
| Public R2 media | Hosting local media at verified public R2 URLs | [public R2 media](references/public-r2-media.md) |
