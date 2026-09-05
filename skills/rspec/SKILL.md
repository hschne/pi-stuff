---
name: rspec
description: RSpec suites for Ruby and Rails. Use when writing, reviewing, or debugging specs; choosing matchers, mocks, spies, or test doubles; structuring examples with let, subject, hooks, or shared examples; diagnosing flaky or order-dependent failures; or changing .rspec, spec_helper, rails_helper, or runner configuration.
---

# RSpec

Use the suite's installed version and local conventions to make behavior-focused, reproducible specs.

## Workflow

### 1. Establish the Suite Contract

Read the nearest implementation and its specs, plus the dependency lockfile, project test command, `.rspec` files, `spec/spec_helper.rb`, `spec/rails_helper.rb`, loaded support files, and neighboring specs of the same kind.

Determine from them:

- the installed RSpec and integration versions, the exact runner, and the project's required broader check;
- the intended test seam, helper, metadata, and data-builder pattern;
- whether the behavior in question belongs to application code, RSpec, a plugin, or a framework integration.

Flags and configuration APIs move between series. Confirm anything the suite does not already demonstrate against the installed runner's `--help` and the documentation series matching the lockfile, not remembered syntax.

**Complete when:** the relevant versions, local test command, closest prior art, and behavior under test are identified.

### 2. Load Only the Relevant Branches

| Branch       | Load when                                                                                                                       | Reference                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Core         | Structuring setup with `let`, `subject`, or hooks; changing configuration, metadata, shared behavior, filtering, or ordering; diagnosing failures or flakiness | [Core](references/core.md)                 |
| Expectations | Choosing or writing matchers, assertion shape, or failure messages                                                              | [Expectations](references/expectations.md) |
| Mocks        | Using or reviewing stubs, message expectations, spies, or partial doubles                                                       | [Mocks](references/mocks.md)               |
| Rails        | The example boots Rails or covers models, requests, jobs, mailers, views, routing, or system behavior                           | [Rails](references/rails.md)               |

Load every applicable branch; plain Ruby work loads no Rails branch.

**Complete when:** each RSpec-specific decision is covered by a loaded branch and no unrelated integration branch is loaded.

### 3. Choose the Proof

State the externally observable behavior and choose the highest stable seam that proves it. Keep each example independent and attributable to one behavioral reason for failure.

For a regression, reproduce the failure before changing production behavior when practical.

For a review, trace each expectation and mock back to a product contract and run the review checks of every branch loaded in step 2. Report each finding as location, the contract it breaks, and the smallest correction.

**Complete when:** each example can fail for a clear behavioral reason and does not require another example to run first.

### 4. Implement in the Suite's Vocabulary

Follow nearby example-group, description, helper, data-builder, and metadata patterns unless they caused the defect. Descriptions should identify behavior and context rather than restate method calls.

When behavior depends on time, randomness, or the environment, pin that input through the suite's existing tool while writing the spec instead of accepting whatever value the run supplies.

Do not weaken production visibility, rescue failures, broaden timing windows, or change global suite settings merely to make a spec pass.

**Complete when:** the spec reads as a behavior contract and setup is discoverable.

### 5. Verify and Diagnose

Run the project-owned narrow command for the changed example or file, targeting it by `path:line` or example identifier rather than by a description filter, which loads every spec file in the suite. When behavior was added or fixed, confirm the new example fails without that behavior when practical. Then run the affected group and the project's required check.

If a failure is intermittent, preserve the exact command, example identifier, seed, and first useful failure before changing anything. Reproduce under the same conditions, then vary one suspected source of nondeterminism at a time using the Core branch.

For configuration changes, exercise a spec that depends on the changed setting or hook; a successful parse proves nothing.

Before completion, check that no focused or temporary filters, retries, sleeps, debug output, or intentionally failing examples remain, and that every skipped or pending example names the defect or condition that removes it.

**Complete when:** targeted coverage and the required broader check pass, the relevant failure mode was observed or explicitly noted as unverified, and the command plus result can be reported.
