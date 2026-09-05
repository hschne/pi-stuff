# RSpec Expectations

## Match the Observable Contract

Choose the matcher that states the promised outcome most directly:

- an exact value when exactness is part of the contract;
- collection, predicate, type, or attribute matchers when those are the actual semantics;
- a change matcher for a state transition only when both the action and the observed value are clear.

Matchers that observe an effect — `raise_error`, `throw_symbol`, `change`, `yield_*`, `output`, and the Rails enqueue matchers — need the code inside a block. Handing them an already-evaluated value runs the effect before the expectation can observe it.

Do not replace a precise outcome with a broad truthiness, non-nil, generic exception, or snapshot-style assertion unless that broad contract is intentional. A negative expectation must state what is forbidden; prefer a positive assertion of the intended alternative when broad negation would allow many invalid outcomes.

## Error Expectations

`raise_error` has three forms RSpec itself warns about, because each can pass without the code under test doing anything:

| Form                                | Why it passes wrongly                                                                   | Write instead                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `to raise_error` with no argument   | matches a `NoMethodError`, `NameError`, or `ArgumentError` raised before the call happens | `raise_error(SpecificError, /detail/)`                   |
| `raise_error(nil)`                  | same, and the `nil` is almost always accidental                                           | name the class                                           |
| `not_to raise_error(SpecificError)` | any other error also satisfies it                                                         | `not_to raise_error`, or assert the error you do expect  |

Match the message with a string, regexp, or `.with_message`, and inspect a structured exception with the block form or `an_instance_of(Klass).and having_attributes(…)`. Suppressing the warnings with `on_potential_false_positives = :nothing` removes the diagnostic, not the false positive.

## Failure Quality

Read the failure output while developing a new assertion. It should identify the expected contract, the actual value, and the meaningful difference without inspecting matcher internals.

Use built-in matchers first, including their noun-phrase aliases (`a_string_matching`, `a_hash_including`, `an_instance_of`) as arguments to other matchers, and `define_negated_matcher` when a composed expression needs to read as an exclusion.

Write a custom matcher when a domain assertion recurs or needs domain-specific diagnostics: give it a precise `description` and failure messages, declare `supports_block_expectations` if callers will write `expect { … }.to`, set `match(notify_expectation_failures: true)` when expectations inside the match block should surface as real failures, and opt into `diffable` only when expected and actual form a useful diff. Define it in the group or a module when only that scope needs it; `RSpec::Matchers.define` is global.

`aggregate_failures` reports every failed expectation from one action instead of stopping at the first. Use the `:aggregate_failures` metadata for independent expectations about a single outcome, and the block form where a later step depends on an earlier one, so a failed precondition still aborts the rest. It collects hook and mock failures too, but it is implemented with a thread-local: an expectation that fails on another thread aborts immediately and is not collected.

## Version-Sensitive Semantics

Matcher composition, generated descriptions, and the custom-matcher DSL vary by `rspec-expectations` version. `expect` is the supported syntax and has no `==` or `=~` operator matchers; unenabled `should` is deprecated. Replace `3-13` in these URLs with the installed version.

- [Built-in matchers](https://rspec.info/features/3-13/rspec-expectations/built-in-matchers/)
- [Custom matchers](https://rspec.info/features/3-13/rspec-expectations/custom-matchers/)
- [RSpec Expectations API](https://rubydoc.info/gems/rspec-expectations)

## Review Checks

- Every expectation proves externally meaningful behavior rather than repeating setup or exposing private intermediate state.
- Matcher precision matches the product contract without overspecifying representation.
- Effect matchers receive a block, not an evaluated value.
- Error assertions name a class or message, and no negated `raise_error` carries an argument.
- Custom matchers produce actionable failure output and are tested when their logic is nontrivial.
