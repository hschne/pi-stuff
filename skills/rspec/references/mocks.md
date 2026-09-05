# RSpec Mocks

## Choose the Boundary

Use a double when the collaborator is slow, nondeterministic, destructive, external to the unit's contract, or impractical to construct. Prefer a real value object or in-memory collaborator when it is fast and makes the behavior clearer.

Mock roles at architectural boundaries, not private implementation steps. If a behavior-preserving refactor would force widespread mock changes, the suite is coupled to implementation rather than contract.

Prefer verifying doubles (`instance_double`, `class_double`, `object_double`) for an existing object or class; they check method existence, arity, and keywords against the loaded constant. Naming the class as a string defers the lookup, and an unloaded constant leaves the double unverified while still passing, so reference the real constant unless the suite has a reason not to; `verify_doubled_constant_names = true` turns a misspelled or unloaded constant into a failure.

`instance_double` cannot verify methods defined through `method_missing`, because it has no instance to ask. Use `object_double` against a real instance, or define the method, instead of dropping to an unchecked double.

A null-object double or plain `spy` answers every message, so it silently absorbs calls to methods that were renamed or never existed. Use `instance_spy`, `class_spy`, or `object_spy` to keep verification.

## Stub or Expect Deliberately

Use a stub to provide collaborator behavior the example needs. Use a message expectation only when sending that message, with those arguments, is itself part of the behavior being specified.

Avoid asserting incidental call order or exact call counts. Add them when order or cardinality is externally meaningful — a protocol, a transaction boundary, an idempotency guarantee.

For spy assertions, arrange the spy before exercising the subject and verify after the action. With mutable arguments, later mutation makes recorded-call assertions misleading; prefer immutable inputs or assert a stable value at the interaction boundary.

`with` compares each argument with `===`, so any matcher — `hash_including`, `kind_of`, `an_object_having_attributes`, `satisfy` — states the part that matters. Overly broad matchers hide wiring errors; matching an entire incidental object shape makes harmless changes expensive.

## Partial and Global Replacement

A partial double changes a real object. Its stubs are checked against that object's real interface only when the suite enables `verify_partial_doubles`, which defaults to off for backwards compatibility while the generated `spec_helper.rb` turns it on; without it, stubbing a renamed or misspelled method passes and the example proves nothing. Read the setting in the suite helper before trusting a partial stub, and report a missing one as a suite finding instead of compensating inside the example.

Doubles, stubs, message expectations, and stubbed constants live for one example and are verified and torn down after it. Using them from `before(:context)` or a suite hook raises "outside of the per-test lifecycle is not supported", and a double stashed in global state and reused later raises "leaked into another example". Both errors name the lifecycle, not the mistake: move the setup into `before(:example)`, or wrap the non-example scope in `RSpec::Mocks.with_temporary_scope` when it genuinely needs a double.

Treat replacements of constants, environment access, process-wide services, clocks, and any-instance behavior as global state: keep them inside the example lifecycle so automatic cleanup applies, and verify restoration.

Avoid any-instance stubbing. Its counts read differently from the rest of the API — `expect_any_instance_of(Widget).to receive(:name).twice` requires each instance to receive the message twice, not two calls in total. Introduce or use an explicit injection seam when practical; if legacy code requires any-instance behavior, constrain the example tightly and make the global nature visible.

Avoid `receive_message_chain`. It stubs a whole path in one statement, so it applies to nothing when the code walks the path in a different order, and the example then fails or passes for reasons unrelated to the stub. Stub the first collaborator and return a double for the next step.

Do not stub the subject's private methods to force a path. Build the public precondition or extract a collaborator whose public contract can be substituted.

## Version-Sensitive Semantics

Verifying-double behavior, spy argument recording, constant mutation, and matcher support vary by `rspec-mocks` version and configuration. Replace `3-13` in these URLs with the installed version.

- [Verifying doubles](https://rspec.info/features/3-13/rspec-mocks/verifying-doubles/)
- [Mutating constants](https://rspec.info/features/3-13/rspec-mocks/mutating-constants/)
- [RSpec Mocks API](https://rubydoc.info/gems/rspec-mocks)

## Review Checks

- Each mocked interaction is a collaborator contract, not an implementation detail.
- Existing collaborators use verifying doubles against a loaded constant, and the suite verifies partial doubles.
- Stubs supply setup; message expectations prove required interactions.
- Call order, counts, and argument precision correspond to real requirements.
- Partial or global replacements cannot leak beyond the example, and no double is built outside the per-example lifecycle.
- Neither `receive_message_chain` nor any-instance stubbing stands in for an available injection seam.
- The example would fail if the required interaction or resulting behavior were absent.
