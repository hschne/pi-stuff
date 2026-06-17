---
name: rails-review
description: Opinionated review of Ruby/Rails changes against our house conventions — direct, concrete, allergic to over-engineering. Use when asked to review, critique, or do a QA/polish pass on a Rails diff, file, PR, or recent changes. Triggers on "review my changes", "rails review", "critique this controller/model", "is this idiomatic Rails".
---

# Rails Review

Review lens for Rails changes. The rules are _our_ conventions in the `rails` skill — this skill does not restate them, so when a finding needs detail, read the matching `rails` reference and cite the rule.

## How to Review

1. Get scope. If none given, run `git diff`; fall back to `git show HEAD` if the diff is empty.
2. Read the changed code in full. For architecture or layering claims, read the actual code paths — no findings from vibes.
3. Flag violations of the rules below, highest-severity first.
4. For each finding: state the issue and write the replacement code with a `file:line` reference. A one-liner is fine.
5. End with `Ship it` if it's good, or a prioritized fix list if not.

## Severity Order

1. Correctness and data safety.
2. Authorization boundaries.
3. Maintainability and readability.
4. Performance hot spots.
5. Style and polish.

## Judgment Calls

When a rule below doesn't decide it, lean on these:

- **Abstractions must earn their keep.** Can't point to a second real caller or 3+ variations? Inline it. Single-use concerns, one-off delegators, and anemic extracted methods get deleted. 
- **Thin controllers, rich models.** Business logic, multi-record operations, and domain branching belong in the model or a concept-named PORO in `app/models/`, never a controller, helper, or `*Service`. 
- **DB enforces invariants.** Constraints and unique indexes in the migration; add an AR validation only when you render a user-facing error. 
- **Write-time over read-time.** Counter caches and precomputed values at save, so reads stay paginable. 
- **Everything is CRUD.** Turn verbs into nested resources, not custom actions. 
- **Names are design.** Positive (`active` not `not_deleted`), domain-driven (`Closure` not `CardClose`), able to stand alone, consistent. 
- **YAGNI.** No use case today? Don't build the guard.
- **Trust Rails built-ins before gems.** Ask whether 50–150 lines in-repo is simpler than the dependency.

## Flag Immediately

- Service objects / `*Service` / `.call` → model method or concept-named PORO in `app/models/`. 
- Business logic, multi-model writes, or data transformation in a controller → model. 
- Nested conditionals → guard clauses and early return. 
- Pundit policy receiving the wrong record type, or branching with `is_a?` → give the policy its own record type. 
- Strong params that coerce types, symbolize, or restructure → just `params.expect`/`permit`. 
- Custom controller action where a nested CRUD resource fits → `resource :closure`. 
- Repeated `before_action :set_parent` across a namespace → shared `Namespace::ApplicationController`. 
- Complex workflow in a callback (jobs, mail, external calls) → job or PORO. 
- Loose boolean for an attributed state change → record (`Closure` gives who/when); string status column or `status == "x"` → enum + predicate. 
- `has_many` without a counter cache where counts are read. 
- `validates :x, uniqueness: true` without a backing unique index. 
- Unscoped lookup in a tenant-aware flow (`Comment.find(params[:id])`) → scope through owner/tenant. 
- `.pluck(:id)` + `WHERE IN` → `.select(:id)` subquery; `.map(&:name)` on a relation → `.pluck(:name)`. 
- Denormalized table cramming several concerns → one concern per table, foreign keys, check constraints. 
- Query or filtering logic in a view → scope assigned in the controller. 
- Inline `turbo_stream` in a controller → `.turbo_stream.erb` template. 
- `button_to` nested inside `form_with` (invalid nested form, wrong submit). 
- Helper reaching for an instance variable → pass it in explicitly. 
- Job carrying business logic instead of orchestrating; external API not wrapped in a concept PORO returning a value object. 
- Business rules, auth flags, or derived state computed in the frontend → compute in Ruby. 
- Metaprogramming for 2–3 cases → just write the methods.
- New gem without strong justification → can vanilla Rails do this?


## Question These

- Any new gem or toolchain addition — "don't like the idea of proliferating on the tool chain here."
- In-memory sorting/filtering of things that need pagination — "This all needs to be converted to a delegated type, so you have a single table you can pull from."
- Cache dependencies fanning out — prefer touch chains or lazy loading over registering broad cache dependencies.
- Comments that say what, not why — "It says what's happening, but not why?"
- Tests of framework behavior — "All it tests now is that normalize works, which is a framework feature."
- Special-case queries guarding bad data — normalize at input instead ("guard against this as an input... with a normalize provision").
- Missing coverage where it matters — "Feels like we're short some testing for this stuff."

## Flag in Tests

- RSpec or factories → Minitest + fixtures. 
- Cross-cutting "feature" test files or concern test files → fold into the owning model/controller test. 
- Testing framework behavior (callbacks, basic CRUD, associations) or asserting on `response.body` content. 
- A method made `public` only so a test can reach it → assert through the public API or the DB. 
- Assertions buried inside `travel`/`assert_difference` blocks, nested `assert_difference`, comments, or assertion message strings. 
