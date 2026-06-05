---
name: hk
description: Configure, migrate, debug, or write hk git-hook manager configs with Pkl, especially when replacing pre-commit or mise hook tasks. Use when working with hk.pkl, hk install/run/check/fix/validate, Pkl hook config, staged-file linting, autofix hooks, or hk + mise integration.
---

# hk

Use hk as the git-hook/file-selection layer and keep project task definitions as the command source of truth when they already exist.

## Core Rules

- Prefer `hk.pkl` for hook orchestration; do not keep old `.git/hooks/pre-commit` shims or duplicate pre-commit/mise wrappers once hk owns the hook.
- In Hans's projects, prefer global mise tools/config (`~/.config/mise/config.toml`) over adding project-local `[tools]`, unless the project needs pinned versions.
- When existing mise tasks already define lint/fix commands, call those tasks from `hk.pkl` instead of duplicating command lines.
- If no project task exists for a tool, prefer hk `Builtins` before inventing custom shell snippets; builtins are transparent Pkl configs, not downloaded hook repos.
- Keep Pkl readable: inline values used once; only introduce `local` variables for reused mappings or genuinely shared values. Name reusable linter mappings `linters`.
- Keep `check` commands read-only and put mutations in `fix`; hk parallelizes checks and uses locks around fixes.
- Prefer autofix in `pre-commit` when requested: `fix = true`, `stash = "git"`, and let hk stage fixed files by default.
- Check local agent/tool configs that invoke old hooks, especially `.pi/patrol.json`.

## Workflow

1. Gather current hook/task context:

   ```bash
   find . -maxdepth 3 \( -name 'mise.toml' -o -name '.mise.toml' -o -name 'hk.pkl' -o -name 'hk.local.pkl' -o -name '.pre-commit-config.yaml' \) -print
   git config --show-origin --get-regexp '^hook\.|^hk\.' || true
   ls -la .git/hooks 2>/dev/null || true
   ```

2. If using mise integration, ensure global mise has hk support:

   ```toml
   [env]
   HK_MISE = "1"

   [tools]
   hk = "latest"
   pkl = "latest"
   ```

   `pkl` is needed for hk's default Pkl evaluator. `HK_PKL_BACKEND=pklr` can avoid the CLI, but the Pkl CLI is the stable default.

3. Install hk hooks globally unless the user explicitly wants repo-local hooks:

   ```bash
   hk install --global --mise
   ```

   Global hooks no-op in repos without `hk.pkl`. Avoid installing both global and local hk hooks because Git can run both.

4. Write `hk.pkl` with one concise `linters` mapping and hook blocks:

   ```pkl
   amends "package://github.com/jdx/hk/releases/download/v1.46.0/hk@1.46.0#/Config.pkl"

   local linters = new Mapping<String, Step> {
     ["ruby"] {
       glob = "**/*.rb"
       check = "mise run rb:check -- {{ files }}"
       fix = "mise run rb:fix -- {{ files }}"
     }

     ["javascript"] {
       glob = List(
         "app/javascript/**/*.js",
         "app/javascript/**/*.ts",
         "app/javascript/**/*.svelte",
       )
       check = "mise run js:check -- {{ files }}"
       fix = "mise run js:fix -- {{ files }}"
       batch = true
     }
   }

   hooks {
     ["pre-commit"] {
       fix = true
       stash = "git"
       steps = linters
     }

     ["check"] {
       steps = linters
     }

     ["fix"] {
       fix = true
       steps = linters
     }
   }
   ```

5. If no existing task owns a command, import and customize builtins instead:

   ```pkl
   import "package://github.com/jdx/hk/releases/download/v1.46.0/hk@1.46.0#/Builtins.pkl"

   local linters = new Mapping<String, Step> {
     ["prettier"] = (Builtins.prettier) {
       glob = List("app/javascript/**/*.js", "app/javascript/**/*.ts")
       batch = true
     }
   }
   ```

6. If hk calls mise tasks with file args, make those tasks file-aware using mise's `usage` field:

   ```toml
   [tasks."js:check"]
   usage = 'arg "[files]" var=#true'
   run = "pnpm exec eslint --quiet ${usage_files:-app/javascript}"
   ```

   `arg "[files]" var=#true` means optional variadic positional args. Mise exposes them as `$usage_files`.

7. Remove old hook entry points after hk is installed:

   ```bash
   rm -f .git/hooks/pre-commit .git/hooks/pre-commit.old
   ```

   Also remove obsolete `mise run pre-commit` tasks/wrappers when the user does not want them.

8. Validate and inspect the plan:

   ```bash
   hk validate --no-progress
   hk run pre-commit --plan --no-progress
   hk check --all --plan --no-progress
   ```

   Use targeted plan checks to confirm globs:

   ```bash
   hk check --plan --no-progress path/to/file.rb
   hk fix --plan --no-progress path/to/file.js
   ```

## Pkl Style Preferences

**Good:** inline one-use globs and use `linters` for reused steps.

```pkl
local linters = new Mapping<String, Step> {
  ["erb"] {
    glob = "**/*.erb"
    check = "mise run erb:check -- {{ files }}"
  }
}
```

**Bad:** create one-use variables and overly specific names.

```pkl
local erb_files = List("**/*.erb")
local pre_commit_steps = new Mapping<String, Step> {
  ["erb"] { glob = erb_files }
}
```

Use `local` for reused maps (`linters`) or values referenced by multiple steps. Otherwise inline for scanability.

## Useful Docs

- hk getting started: `https://hk.jdx.dev/getting_started.html`
- hk configuration: `https://hk.jdx.dev/configuration.html`
- hk examples: `https://hk.jdx.dev/reference/examples/`
- hk mise integration: `https://hk.jdx.dev/mise_integration.html`
- hk Pkl intro: `https://hk.jdx.dev/pkl_introduction.html`
- mise task arguments: `https://mise.jdx.dev/tasks/task-arguments.html`
