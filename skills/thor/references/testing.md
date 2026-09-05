# Testing Thor CLIs

Follow the suite's existing CLI tests — file layout, entry helper, and subprocess-versus-in-process convention — and add a harness only when no prior art covers the boundary you need.

## Choose the Boundary

| Concern                                                         | Preferred evidence                                    |
| --------------------------------------------------------------- | ----------------------------------------------------- |
| command registration, inheritance, or subcommand mapping        | focused metadata assertion plus public help           |
| argument and option parsing                                     | invoke the Thor entry class with argv                 |
| domain behavior after normalized input                          | ordinary Ruby unit test without Thor                  |
| executable boot, streams, environment, signals, and exit status | subprocess running the real executable                |
| `Thor::Group` / `Thor::Actions` filesystem behavior             | temporary destination with prompts made deterministic |

Direct method calls bypass parsing, dispatch, Thor error handling, and process status, so they cannot replace subprocess coverage. In the other direction, a domain case forced through the executable localizes failures poorly.

`exit_on_failure?` decides the process status, so cover it with a subprocess. An in-process example sees the raised or rescued error, never the status the user gets.

## Derive Cases from the Schema

Expand the command schema from `SKILL.md` for the items the change affects:

- each changed option: omitted, explicit, aliased, and invalid form
- each positional argument: the minimum valid invocation, plus optional and repeated forms
- option placement when parent and subcommand parsers both accept the token
- help at every level whose text or usage changed
- each failure the schema records, including application validation failures

For failures, assert status, diagnostic stream, a stable message fragment, and absence of side effects. For success, assert status, contractual output, and resulting side effects.

Leave untouched schema items to existing coverage, and normalized-input behavior to domain unit tests.

## Exercise the Real Process

Prefer an argv-safe subprocess API such as Ruby's `Open3.capture3`:

```ruby
stdout, stderr, status = Open3.capture3(environment, executable, *arguments, chdir: root)
```

Pass the executable and its arguments separately unless shell parsing is the behavior under test, and assert `status.success?` or the expected numeric status separately from output.

Use the repository's real executable and package runner. A direct `ruby path/to/executable` call is valid only when that is how the project boots.

## Keep Tests Deterministic

- Redirect current directory, environment, home and config paths, and filesystem writes into a temporary directory, and restore them in teardown even after a failure.
- Provide explicit input streams for prompts, including the file-collision prompt, which otherwise blocks on stdin.
- Pin help output that varies with the terminal: set `THOR_COLUMNS` and force the plain shell with `Thor::Base.shell = Thor::Shell::Basic`. Color also depends on `$stdout.tty?`, `TERM`, and `NO_COLOR`, so leave those out of assertions unless they are under test.
- Assert semantic help and message fragments rather than Thor's exact spacing and wrapping. Use a snapshot only when exact presentation is the contract.
- Assert usage banner text through the real executable; an in-process run derives the banner from the test process name, so its expectation can pass while the shipped banner is wrong.
- Stub below the Thor boundary for destructive or external operations, and keep an assertion that the parsed values reached that boundary.

In-process `start` returns the command's return value, writes through a shell object, and may raise `SystemExit` when failure exits are enabled. Assert that return value directly when it is meaningful instead of parsing stdout for it, and read the locked `Thor::Base.start` before choosing between capture and exception assertions.

## Completion Check

A Thor CLI test change is complete when:

1. the derived cases cover the changed public paths without duplicating domain tests,
2. at least one test crosses Thor parsing and dispatch,
3. boot, stream, and exit-status claims come from the real executable, and
4. status and streams are asserted separately.
