# Thor::Group and Thor::Actions

Generator classes differ from ordinary Thor classes in what becomes a command, in what runs, and in what touches the filesystem.

## Group Semantics

- Running a group runs **all** of its commands, in declaration order, as one unit. Reordering methods reorders the generator.
- Every public instance method becomes a command, with or without `desc` (`lib/thor/group.rb:263`, 1.5.0). A helper left public becomes a generator step — put helpers in `no_commands { }` or make them private.
- A group has no `help` command. Help is recognized only as the first argument, so `generator step --help` does not print help.
- `invoke :OtherClass` and `invoke_from_option :option_name` create steps that run in their declaration position, and the invoked class's options appear in the group's help under that class's own heading.

## Actions

`include Thor::Actions` adds the filesystem action set. Call `add_runtime_options!` to expose `--force -f`, `--pretend -p`, `--quiet -q`, and `--skip -s`; without it the behavior flags exist internally but users have no switches for them.

**Paths.** Template lookup tries the class `source_paths`, then `source_root`, then the superclass paths, and also tries `<file>.tt` before failing. Write destination paths relative to `destination_root`, not to `Dir.pwd`: `inside(dir)` pushes onto the destination stack and changes directory, `in_root` returns to the bottom of that stack, and under `--pretend` the directory change is skipped while the block still runs.

**Behavior.** `behavior` is `:invoke` or `:revoke`; `:force` and `:skip` mean `:invoke` plus the corresponding flag. Any new destructive step must do nothing under `--pretend` and must undo itself under `:revoke` if the generator supports revocation.

**Collisions.** Creating a file that exists with different content prompts `[Ynaqdhm]` on stdin and blocks until answered, so a non-interactive run needs `--force`, `--skip`, or a supplied input stream.

**Subprocesses.** `run` honors `--pretend`, and it aborts on a failing child only when `abort_on_failure` is true, which defaults to the class's `exit_on_failure?`.

**Remote input.** `apply` and remote `get` fetch through `open-uri`, and upstream states that Thor should not receive application user input for this reason (`README.md:16`, 1.5.0). Keep user-supplied strings out of those arguments.

## Verification

Exercise every changed action against a temporary destination root and assert the created, changed, and skipped files as well as the output. Derive the cases and the harness choice from [testing Thor CLIs](testing.md).
