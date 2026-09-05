# RSpec Core

## Configuration Ownership

Put a setting at the narrowest scope that matches its purpose: `.rspec` for team-wide runner defaults, helper files for suite configuration and support loading, metadata for a category of examples, the example group for behavior that is truly local.

Before changing configuration, inspect every loaded option file. Options merge from `$XDG_CONFIG_HOME/rspec/options` or `~/.rspec`, then `./.rspec`, then `./.rspec-local`, then `SPEC_OPTS` and the command line, each overriding the last, and `--options FILE` discards those defaults. A personal or local file can change what the committed `.rspec` implies.

Keep `spec_helper.rb` cheap: every run loads it. Give dependency-heavy setup its own file that the specs needing it require, or defer it with `config.when_first_matching_example_defined(:tag)`. A blanket `Dir[…spec/support/**/*.rb].sort.each { |path| require path }` pays for every support file on every run and also runs any `*_spec.rb` stored under `spec/support` twice.

Put `--require spec_helper` in `.rspec` rather than at the top of each spec file; RSpec resolves the spec-file pattern after `--require`.

Scope behavior to a capability or category with `config.define_derived_metadata` and filtered hooks such as `config.before(:example, type: :model)` instead of configuring the whole suite.

Where the suite calls `disable_monkey_patching!`, bare `describe`, `should`, and `should_receive` raise; write `RSpec.describe` and the `expect`/`allow` forms.

## Shared Examples and Contexts

Use a shared group for a behavioral contract every includer must satisfy, and pass differences in explicitly rather than branching on the including group's internals.

`include_examples` inlines the shared group into the current context, so two inclusions in one context redefine the same `let` and helper methods and the last declaration wins — the earlier inclusion's examples then fail for reasons that are visible in neither file. Use `it_behaves_like`, which nests one context per inclusion, whenever a context includes a group more than once or with different arguments.

RSpec does not autoload shared groups. The defining file must be required before the file that uses it, and a shared group is visible only to the context that defined it and that context's descendants; a sibling group fails with "Could not find shared examples".

## Example State and Setup

`let` runs on first use and memoizes for the rest of that example, then resets. Two calls in one example return the same object, so a mutation made through one is visible through the other. Avoid mutating state inside a `let` or `subject` block: the reader cannot see the write at the call site.

`let` is lazy: a definition whose point is a side effect never happens unless something references it. `let!` forces it by invoking the helper from a `before` hook that runs in declaration order among the group's hooks. Use `let!` only when the existence of the record or side effect is itself the precondition, and name it so.

A nested group overrides a `let` by name, and a `let` that calls another resolves to the innermost definition. An override several groups away can change a value the example never mentions. Define a value that decides the outcome in the group describing that condition, not in a distant parent.

`subject(:order)` defines both `subject` and `order` for the same object; call the named helper in examples. Leave the subject implicit only where the group description already identifies it, and do not use `subject` for setup that is not the thing being exercised.

`it { is_expected.to … }` generates its description from the matcher, so the example cannot be selected with `--example` and cannot take a block expectation. Use it only where the generated sentence states the behavior a failing run needs to report; write a full description otherwise.

## Hook Scopes

| Hook               | Runs                                    | State it creates                                               |
| ------------------ | --------------------------------------- | -------------------------------------------------------------- |
| `before(:example)` | before every example in the group       | fresh per example; the default choice                          |
| `before(:context)` | once for the group                      | shared by every example in it and not reset between them       |
| `before(:suite)`   | once per run, from suite configuration  | process-wide; nothing undoes it automatically                  |
| `around`           | wraps the example and its example hooks | whatever the wrapper holds open; the hook must run the example  |

`after` hooks run in reverse order, innermost group first, and run even when the example failed.

`before(:context)` is the main source of cross-example leakage: examples and nested groups at any depth share the objects it builds, one example's mutation is visible to the next, and per-example database transactions do not roll back records it created. Use it only for expensive setup examples treat as read-only, then confirm the group still passes in a different order. A failure in `before(:context)` fails every example in the group and its nested groups; an error in `after(:context)` is reported on its own, attached to no example.

An `around` hook receives the example as a proc and must run it (`example.run`). It wraps the example's `before`/`after` hooks but not context hooks, shares no instance variables with the example, and cannot drive rspec-mocks. Use `before`/`after` unless the resource being managed requires a block.

## Ordering, Seeds, and Bisect

A randomized run prints the seed it used, and rerunning with that seed reproduces the order: RSpec randomizes examples within each level and always runs a nested group after its parent, so context hooks are not re-run. Capture the seed with any intermittent failure; without it the failure is not reproducible and later runs prove nothing.

The seed orders examples only. RSpec never calls `srand`, so the application's own randomness is unseeded unless the suite adds `srand RSpec.configuration.seed`. Do not pin a seed in configuration to quiet an order-dependent failure; that hides the dependence instead of removing it.

Bisect narrows an order-dependent failure by rerunning smaller subsets of the examples that preceded it, reporting the smallest set that still reproduces it. Give it the seed and the example identifier from the failing run. The example it names as leaking state is usually in a different file from the one that failed.

Rerunning only previous failures depends on a configured example-status persistence file. Without that setting there is no history to read, and the run looks clean while covering nothing.

## Focus, Skip, and Pending

Focus metadata narrows a run only when the configuration enables filtering on it, normally through `config.filter_run_when_matching :focus`, which is ignored when nothing is focused. Unconfigured, a stray focus does nothing; configured, a stray focus quietly reduces CI to a handful of green examples. Determine which case the suite is in before using or reviewing focus.

Location filters (`path:14`) and description filters (`-e`) outrank tag exclusions, so `rspec spec/order_spec.rb:14` runs an example that a `--tag ~slow` in `.rspec` would otherwise skip.

`skip` does not run the body. `pending` runs the body, expects it to fail, and fails the run when it passes, which is what makes it a reminder rather than dead weight. Use `pending` for a known defect being fixed, and `skip` only with a stated reason and a condition that removes it.

## Failure Diagnosis

Start with the first useful failure and its full backtrace. Rerun the smallest reproducible unit by example identifier under the seed recorded from the failing run, then classify before editing:

| Signal                              | Investigate                                                                                         | Verification                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Depends on suite order              | leaked constants, class state, configuration, records, environment, or unstubbed globals            | reproduce with the recorded seed, then bisect                                                   |
| Fails across repeated isolated runs | uncontrolled randomness, clock boundaries, external services, concurrency, or resource limits       | repeat the same isolated command enough times to observe the original failure mode              |
| Fails only near time boundaries     | wall-clock use, time zones, precision, or eventual work                                             | control the clock through the project's existing tool and assert the relevant boundary          |
| Fails around asynchronous work      | missing synchronization, or an assertion made before the observable result                          | wait on an observable condition with a timeout the integration supplies, not an arbitrary sleep |
| Fails only in CI                    | environment, load order, parallelism, database isolation, locale, or dependency version differences | reproduce the relevant CI inputs locally or collect evidence that distinguishes them            |

A retry can measure or expose an intermittent failure; it is not a repair.

## Version-Sensitive Semantics

Runner flags, configuration APIs, and defaults move between series, and the generated `spec_helper.rb` opts explicitly into settings that a later series makes the default. Read the series matching the lockfile — replace `3-13` in these URLs with the installed `rspec-core` version.

- [RSpec Core feature documentation](https://rspec.info/features/3-13/rspec-core/)
- [RSpec Core API documentation](https://rubydoc.info/gems/rspec-core)

## Review Checks

- Examples are order-independent and clean up global mutations.
- No example depends on state a context- or suite-scoped hook left behind.
- The values that decide an example's outcome are defined where the reader will look for them, and `let!` marks a precondition rather than a habit.
- Shared groups encode a named contract rather than incidental reuse, and a context that includes one group repeatedly uses `it_behaves_like`.
- Filters cannot silently omit intended CI coverage.
- Formatters or rescue logic do not hide the original error.
