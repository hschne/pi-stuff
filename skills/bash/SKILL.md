---
name: bash
description: Write concise bash scripts following established conventions. Use when writing new bash scripts, shell utilities, CLI tools, or reviewing and refactoring existing shell scripts. Also use when the task involves argument parsing, subcommands, or script structure decisions in bash.
---

# Bash Scripting

Write bash scripts that follow the conventions in `~/.scripts/`.

## Script Skeleton

Every script follows this structure:

```bash
#!/usr/bin/env bash

set -euo pipefail

main() {
  local arg="${1:-}"

  if [[ -z "$arg" ]]; then
    usage
    exit 1
  fi

  # core logic
}

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS] ARGUMENT

Description of what the script does.

Options:
  -h, --help    Show this help message
EOF
}

die() {
  echo "Error: $1" >&2
  exit "${2:-1}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
```

## Core Rules

- Shebang: `#!/usr/bin/env bash`
- Safety: `set -euo pipefail`
- Wrap logic in `main`, call it via `BASH_SOURCE` guard at the bottom
- Include `die` and `usage` helpers in every script
- Use `local` for all variables inside functions
- Use `[[ ... ]]` for tests, `$(...)` for command substitution
- Quote all variables: `"$var"`, not `$var`
- Avoid superfluous comments

## Function Style

Use `function` keyword only for `main`. Use bare `name()` for everything else.

**Good:**

```bash
function main() {
  validate_input "$1"
}

validate_input() {
  local value="$1"
  # ...
}
```

**Bad:**

```bash
function validate_input() {  # no function keyword for helpers
  # ...
}

main() {  # main should use function keyword
  # ...
}
```

## Argument Parsing

Use a `while` loop with `case` for flags and positional arguments:

```bash
function main() {
  local verbose=false
  local output=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
    -h | --help)
      usage
      ;;
    -v | --verbose)
      verbose=true
      shift
      ;;
    -o | --output)
      output="${2:?Error: --output requires a value}"
      shift 2
      ;;
    -*)
      die "Unknown option: $1"
      ;;
    *)
      break
      ;;
    esac
  done
}
```

### Repeatable Values Over One-Off Flags

When an option selects from a set, take the value as an argument and let it
repeat. Accumulate into one variable, accept a comma separated list, and strip
the leading separator before use. Name the values after the vocabulary of
whatever the script wraps.

**Good:**

```bash
--level)
  levels="$levels,${2:?Error: --level requires a value}"
  shift 2
  ;;
--level=*)
  levels="$levels,${1#*=}"
  shift
  ;;
```

`--level warn --level error`, `--level warn,error` and `--level=warn` all work.
Iterate with `for level in ${levels//,/ }`, and default when `${levels#,}` is
empty. A new value costs nothing.

**Bad:**

```bash
--warning) warning=true; shift ;;
--error)   error=true; shift ;;
--all)     all=true; shift ;;
```

Every value needs its own flag, `--all` exists only to undo the others, and the
caller cannot tell which combinations are legal.

## Subcommands

For scripts with multiple operations, dispatch on the first argument:

```bash
function main() {
  if [[ $# -eq 0 ]]; then
    usage
    exit 1
  fi

  case "$1" in
  start)  shift; start_service "$@" ;;
  stop)   shift; stop_service "$@" ;;
  status) shift; show_status "$@" ;;
  -h | --help) usage ;;
  *) die "Unknown command: $1" ;;
  esac
}
```

## Dependency Checking

Check external tools before using them:

```bash
command -v fzf >/dev/null 2>&1 || die "fzf is required but not installed"
```

## Constants

Use `readonly` for module-level values defined outside functions:

```bash
readonly CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/myapp"
readonly DEFAULT_PORT=8080
```

## Common Paths

- Scripts: `~/.scripts`
- Projects Wiki: `~/Documents/Wiki/projects`
