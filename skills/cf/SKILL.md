---
name: cf
description: Use the Cloudflare `cf` CLI and Local Explorer safely. Trigger when using `cf`, Cloudflare CLI, Cloudflare API commands, Wrangler next-gen CLI, Cloudflare Local Explorer, Miniflare local resources, D1/KV/R2/Durable Objects/Workflows via local explorer, or Cloudflare account/zone/DNS management from the command line.
---

# Cloudflare cf CLI

Use `cf` for Cloudflare API operations and for Local Explorer against local Miniflare resources.

## Core Rules

- Treat `cf` auth as secret-bearing. Tokens are stored under `~/.config/.cf`; do not read, cat, copy, summarize, or commit that directory.
- Prefer discovery over guessing. `cf` is generated and still a technical preview, so command shapes can vary by product.
- Distinguish remote and local operations explicitly. Default commands hit Cloudflare remote APIs; local commands need `--local --local-endpoint <url>`.
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

## Authentication and Context

Use non-secret checks and context commands:

```bash
cf auth whoami
cf context show
cf context set account-id <account-id>
cf context set zone <zone-or-zone-id>
cf context clear <account-id|zone|all>
```

Credential sources:

1. `CLOUDFLARE_API_TOKEN` environment variable
2. `cf auth login` OAuth flow
3. Stored OAuth state under `~/.config/.cf/auth.jsonc`

Context sources:

1. Flags such as `-z <zone-or-zone-id>`
2. `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_ZONE_ID`
3. Project `.cfrc`
4. Global `~/.config/.cf/config.json`

`.cfrc` stores defaults such as account and zone context, not API tokens. Still ask before committing it because account IDs and zones may be environment-specific.

## Local Explorer

Local Explorer exposes a local Cloudflare API mirror for simulated resources started by `wrangler dev`, `cf dev`, or the Cloudflare Vite plugin.

Workflow:

1. Start the app locally with `cf dev`, `wrangler dev`, or the Vite plugin.
2. Note the local origin, usually something like `http://localhost:8787`.
3. Confirm the Local Explorer API is available:

```bash
curl -fsS <local-origin>/cdn-cgi/explorer/api >/dev/null
```

4. Run `cf` commands against local state with both local flags:

```bash
cf <product> <command...> --local --local-endpoint <local-origin>
```

Example:

```bash
cf d1 list --local --local-endpoint http://localhost:8787
```

Use local mode for inspecting or changing simulated D1, KV, R2, Durable Objects, and Workflows data. Do not assume local changes affect remote Cloudflare resources.

## Safety Checklist Before Mutations

1. Run the command with `--help` and confirm required params.
2. Confirm target context with `cf context show` or explicit flags.
3. Add `--local --local-endpoint ...` if the task is about Local Explorer/local data.
4. Use `--dry-run` if available.
5. Keep command output free of tokens and secret values.
