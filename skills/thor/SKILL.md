---
name: thor
description: Thor-based Ruby CLI implementation, review, and testing. Use when changing, reviewing, or testing a Ruby command-line interface built with Thor — commands, subcommands, class and command options, generated help, dispatch, Thor::Group generators and Thor::Actions, and CLI failure or exit-status behavior.
---

# Thor CLI Work

Treat the CLI's observable command contract, not its DSL declarations alone, as the system under change.

## Task Paths

| Task                                             | Steps                                                 |
| ------------------------------------------------ | ----------------------------------------------------- |
| Add or change a command, subcommand, or option   | 1, 2, 3 (Writing), 4, 5                               |
| Review or audit CLI behavior                     | 1, 2, 3 (Reviewing), 4                                |
| Change a `Thor::Group` generator or an action    | 1, 2, 3 (Writing) with [generators](references/generators.md), 4, 5 |
| Add or change tests for existing behavior        | 1, 2, 5; add 4 when the tests cover failure or status |

## 1. Establish the Runtime Contract

1. Identify the real executable, its boot path, the Thor subclasses, shared base classes and mixins, and the existing CLI tests.
2. Print the locked Thor version and its installed source path with the project's package runner:

   ```bash
   bundle exec ruby -e 'require "thor/version"; puts Thor::VERSION; puts Gem.loaded_specs.fetch("thor").full_gem_path'
   ```

   A globally installed gem is not evidence for a bundled application. This skill cites 1.5.0 file positions; confirm each against the printed path when the locked version differs.

3. Run the real executable's top-level `--help`, plus help through any nested path you will change. Usage banners are built from `$PROGRAM_NAME`, so help captured under `rspec` or the `thor` runner does not match help from the installed executable.
4. Trace executable to command class: inherited DSL configuration, mixins that declare options, subcommand registration, default-command selection, custom `initialize`, and invocation configuration.

**Complete when:** the executable, loaded Thor version, command hierarchy, and current public help surface are known.

## 2. Define the Command Schema

For each affected path, write down:

- command, namespace, and aliases
- positional arguments, including required, optional, and repeated shape
- command and class options with types, defaults, aliases, and constraints
- token-order rules, `--` separator behavior, and pass-through arguments where relevant
- behavior for the bare command path with no arguments, the default command, and unknown input
- stdin/TTY assumptions, stdout, stderr, exit status, and side effects for success and failure

This list is the schema. Later steps and the testing reference assert against it instead of restating it.

Record these defaults as the answer wherever the code does not override them:

| Concern                                     | Default behavior                                                                             | Override                                                             |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Unknown `-`/`--` tokens                     | accepted silently and passed on as positional arguments, so a typo'd flag looks like an argument | `check_unknown_options!`, optionally `only:` / `except:`              |
| Commands declared through `subcommand`      | always exempt from the unknown-option check (`lib/thor.rb:372`, 1.5.0)                        | perform the check inside the child class                              |
| Command name matching                       | any unambiguous prefix dispatches; adding a command can turn a working abbreviation into `AmbiguousCommandError` | declare stable short names through `map`                              |
| Short flags `-h -? --help -D`, `-t --tree`  | inherited `map` entries on every Thor subclass, so those aliases are taken (`-t`/`--tree` in 1.5.0) | choose other short aliases, or remap deliberately                     |
| Tokens the parser did not consume           | appended to the command's positional arguments                                                | `strict_args_position!`                                               |
| Tokens after `--`                           | plain positional arguments, exempt from the unknown-option check                              | —                                                                     |
| Arguments forwarded to another program      | parsed as this CLI's own options                                                              | `stop_on_unknown_option! :cmd` with `check_unknown_options! except: :cmd` |
| `options`                                   | frozen hash with indifferent access; `options[:x]`, `options["x"]`, `options.x?` all read it   | `dup` before changing anything                                        |

Check the schema against all three representations: the `desc` usage string, the Ruby method signature, and generated help.

For subcommands, read the parent registration, the child class, and the dispatch code where options, defaults, or injected dependencies cross the boundary. Parent class options reach the child and are merged over the child's own parsed options; `--help` or `-h` after the subcommand name is rewritten into the child's `help` command; and the child's usage banner is prefixed with the parent command name.

**Complete when:** source declarations, method arity, generated help, and intended behavior describe the same interface.

## 3. Implement or Review Narrowly

### Writing and refactoring

- Keep parsing in the Thor layer: pass normalized values into domain objects instead of spreading Thor's `options` hash through application code.
- When the project overrides `initialize` or dispatches with `invoke`, check which arguments, option hashes, parent and class options, shell, and injected dependencies reach the target. `invoke` runs each command at most once per invocation graph, so a deliberate second call to the same command silently does nothing.
- Treat aliases, removed commands, and changed defaults as compatibility decisions, not cleanup.

Thor turns a method into a command from Ruby's `method_added` hook, so declaration order carries meaning:

| Rule                                                                            | Consequence when broken                                                                      |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `desc` (with any `long_desc` and `method_option`) comes before the `def`         | Thor prints `[WARNING] Attempted to create command ...` on stdout and the method is not a command |
| Pending metadata is consumed by the first `def` that follows                     | a method inserted between `desc` and its command takes the description                        |
| `desc` also comes before `subcommand :name, ChildClass`                          | `subcommand` defines a method, so it consumes pending metadata and needs its own description  |
| Helpers live inside `no_commands { }`, private, or behind `attr_*`               | every other public instance method becomes a command                                          |
| Command names avoid Thor's own API — `run` is the common collision               | the class raises at definition time, so the CLI fails to boot                                 |
| `initialize` is defined after any `method_option` that must stay command-scoped  | defining `initialize` flushes pending `method_option`s into `class_option`s                   |

These raise while the class body loads, which surfaces as a boot failure rather than a test failure: a required option that is boolean, a required argument with a default, a required argument after an optional one, and `invoke_from_option :name` without its `class_option`.

Set `check_default_type!` on the base class so a default whose type contradicts its declared type raises at load. Unset, it only prints a deprecation warning that users see at runtime.

Validate positional arguments in the command body. `enum` is enforced for options but is silently skipped for positional `argument`s (`lib/thor/parser/arguments.rb:173`, 1.5.0), and `argument` has no `:boolean` type.

### Reviewing

Trace argv through parsing and dispatch to side effects, and report every place observed behavior differs from the schema. Also check what the schema does not cover:

- commands registered or dropped by accident, including public helpers and methods whose `desc` was consumed by a neighbor
- Thor classes nested inside a command class, whose commands merge into the parent's help
- downstream code that expects a different option type or default than the parser produces

Report each finding as observed behavior, expected behavior, and the evidence — the exact command run or the source location. Prefer public behavior as evidence; use Thor metadata only to diagnose registration or inheritance.

### Generators and actions

Read [Thor::Group and Thor::Actions](references/generators.md) before changing a class that inherits `Thor::Group` or includes `Thor::Actions`.

**Complete when:** the smallest change preserves unaffected command paths and every affected schema item has source or test evidence.

## 4. Handle Failures as CLI Behavior

Choose one owner for each constraint. A value the parser rejects and a value the application rejects differ in message, stream, and status, so decide which layer rejects it and record that behavior in the schema.

- Define `def self.exit_on_failure?; true; end` on every class that can start the process, including subcommand and registered child classes. It defaults to false, which means a `Thor::Error` prints its message and the process still exits 0, and Thor warns about the missing definition.
- Raise `Thor::Error` or one of its subclasses for user mistakes: `start` prints the message through the shell without a backtrace. Let programming errors keep their class and backtrace, and avoid broad rescues that turn them into user errors. `THOR_DEBUG=1` re-raises instead, which is the way to see a backtrace during debugging.
- Send diagnostics to stderr with `say_error` (or `error`) and keep `say`, `say_status`, and `print_table` for stdout data, so the CLI composes in a pipeline. `--quiet` and shell muting silence `say` but not errors.
- Do not rely on a command's return value for the process status. `start` returns it to the caller and ignores it for exit purposes.
- Thor converts an arity mismatch at the command boundary into a usage error, but an `ArgumentError` raised deeper inside the body propagates unchanged.

**Complete when:** each expected failure path has an intentional exception boundary, stream, status, and no unintended side effect.

## 5. Test and Verify

Read [testing Thor CLIs](references/testing.md) when writing or changing tests.

Run verification through the repository's declared toolchain, for every command path under change or test:

1. focused tests for those command paths
2. the real executable's top-level and affected nested help
3. one successful invocation at the appropriate boundary
4. every failure path recorded in the schema

Record the exact invocation and expected status for each manual command, run mutating commands against a temporary directory, and capture status separately from stdout and stderr — a pipe reports the last command's status, not the CLI's.

**Complete when:** focused tests pass, help shows the intended interface, success has the intended effects, and failures have the intended status, stream, and lack of side effects.

## Version-Sensitive Sources

Parsing, subcommand dispatch and help, command registration, and error and exit behavior are version-sensitive. Let the locked gem and the real executable own exact behavior: read the installed source at the path printed in step 1 and query it for the option DSL and APIs in use.

Upstream ships no changelog file and the wiki is unversioned, so confirm feature availability — `tree`, `repeatable`, `exclusive` and `at_least_one`, `say_error` — in the locked source rather than in documentation.

Cite the locked version plus the installed file or a version-qualified URL when a conclusion depends on them. Use a tagged reference, never `main`:

- Tagged source: [rails/thor](https://github.com/rails/thor) (`https://github.com/rails/thor/tree/v<VERSION>`)
- Versioned API documentation: [RubyDoc](https://rubydoc.info/gems/thor) (`https://rubydoc.info/gems/thor/<VERSION>`)
- Behavior changes between versions: [Thor releases](https://github.com/rails/thor/releases)
