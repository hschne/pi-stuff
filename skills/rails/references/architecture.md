# Architecture

Use this reference when reviewing Rails code architecture, especially after an implementation pass or when deciding where behavior belongs.

Rails conventions are the default architecture. Add new seams only when they improve domain language, locality, leverage, or testability. A small amount of well-named Rails code beats a pattern-shaped architecture that hides nothing.

## Architecture Questions

While exploring Rails code, ask:

- Where is a Rails model too shallow, acting only as persistence while business behavior lives elsewhere?
- Where is a model too broad, mixing unrelated domain responsibilities?
- Where are service objects, concerns, or helpers shallow pass-throughs?
- Where does a controller know too much about business rules?
- Where are callbacks hiding important domain workflow?
- Where does an external API, legacy schema, or third-party vocabulary leak into the core domain?
- Where would Rails conventions give better locality than a custom abstraction?
- Where would a small domain object or value object give better leverage than more Active Record conditionals?
- Where is a namespace doing real scoping work, and where is it just organizing files?
- Where does understanding one business operation require bouncing through many small classes?
- Where are tests forced to know implementation details instead of exercising a stable public interface?
- Where has code been extracted only for testability, while the real behavior remains spread across callers?
- Where do names like `Manager`, `Processor`, `Handler`, `Helper`, or vague `Service` hide the domain concept?
- Where is one model enforcing consistency rules for concepts that change independently?
- Where does a job orchestrate a workflow cleanly, and where does it contain the business decision itself?
- Where do two names mean the same thing, or one name means different things in different flows?
- Which object owns each invariant, state transition, and side effect?
- What is the smallest credible improvement that reduces leakage without reorganizing the whole app?

## Evidence Before Findings

Do not report architecture findings from vibes alone. Confirm structural claims by reading the actual code paths involved.

For high-confidence findings, identify:

- the entry point inspected;
- the files and methods where the responsibility lives today;
- the concrete risk created by that structure;
- the smallest credible improvement.

If code-level evidence does not support the concern, downgrade it to an open question or remove it.

## Smallest Credible Improvement

Prefer the smallest change that improves ownership, locality, or domain language. Good architecture work often starts with a rename, an explicit method, an adapter around an external system, or inlining a fake abstraction.

Do not recommend splitting code into new contexts, engines, or large namespaces unless the business boundary is explicit enough to name. Do not treat every large model or namespace as a bounded context.

Pattern choice must be justified by one of:

- a domain invariant that needs a single owner;
- an ownership conflict between flows or contexts;
- repeated coordination that deserves one public interface;
- foreign language leaking from an external system;
- tests forced to cross too many implementation details.

## Rails Defaults First

Prefer ordinary Rails structure until the domain earns something more:

- Controllers handle HTTP, authorization flow, redirects, and response shape.
- Models hold data rules, associations, validations, scopes, state, and simple domain behavior.
- Jobs orchestrate asynchronous workflows and call domain objects; they should not become the domain model.
- Namespaced POROs are useful when behavior is complex, external, reusable, or needs a focused public interface.
- Concerns are only useful when behavior is genuinely shared by multiple models or controllers.

Do not create a new object just because a method is private, a test is awkward, or a pattern name exists. A new object should hide complexity behind a smaller interface.

## Depth and the Deletion Test

For every service object, concern, helper, query object, form object, or namespaced PORO, ask what happens if it is deleted:

- If complexity disappears, the abstraction was probably a pass-through.
- If complexity reappears across several callers, the abstraction was earning its keep.
- If deleting it makes tests simpler without losing coverage, it was likely testing scaffolding rather than architecture.
- If keeping it lets tests exercise one stable interface while implementation changes behind it, it is probably a useful seam.

A deep Rails module gives callers more behavior than they have to understand. A shallow module forces callers to know nearly as much as the implementation.

## Models: Too Shallow vs Too Broad

A model is too shallow when it is mostly persistence while business rules live in controllers, jobs, views, or procedural services.

**Bad:**

```ruby
class Subscription < ApplicationRecord
end

class SubscriptionCanceller
  def call(subscription)
    return false unless subscription.active?

    subscription.update!(state: :cancelled, cancelled_at: Time.current)
  end
end
```

**Good:**

```ruby
class Subscription < ApplicationRecord
  enum :state, %w[active cancelled].index_by(&:itself)

  def cancel
    return if cancelled?

    update!(state: :cancelled, cancelled_at: Time.current)
  end
end
```

A model is too broad when unrelated responsibilities collect on one Active Record class. Extract behavior when a cohesive domain concept emerges, not just because the file is long.

**Good extraction signal:** the extracted object has a domain name, hides real implementation detail, and gives callers a smaller interface.

When a model owns a state transition, make that transition explicit. Do not let several controllers, jobs, or services update the same state columns directly.

State ownership should be easy to say:

```text
Subscription owns cancellation state; billing jobs do not write cancellation columns directly.
Reservation owns availability; invoicing reacts to completed reservations instead of mutating reservation state.
```

## Controllers Should Not Know the Domain

A controller action should read like HTTP coordination. If it explains the business process, the behavior is in the wrong place.

Move business decisions into models or domain objects when the controller:

- branches on domain state beyond simple guards;
- mutates several records as one business operation;
- transforms domain data before saving;
- knows external provider details;
- duplicates rules used elsewhere.

Keep request-specific behavior in the controller: finding scoped records, permitting params, choosing redirects, rendering responses, and returning HTTP errors.

## Service Objects and Domain Objects

A service object is shallow when its name is technical and its interface merely repeats the caller's work.

**Smell:**

```ruby
UserUpdater.call(user, params)
PaymentProcessor.process(payment)
DataSyncService.new(record).call
```

Prefer a domain name that explains the business operation:

```ruby
subscription.renew(plan:)
Claim::Adjudication.new(claim, adjuster:).approve
ExternalCatalog::Importer.new(feed).import
```

Use a namespaced PORO when:

- the behavior calls an external API;
- the workflow is complex enough to deserve a named public interface;
- several callers need the same operation;
- the object protects a domain invariant;
- the code has a meaningful production adapter and test adapter.

Inline it when it is single-use coordination that Rails already expresses clearly.

Avoid extracting a service object that only moves code out of a controller or model without clarifying ownership. Moving code sideways is not architecture.

## Domain Language and Boundaries

Agree on business language before choosing models, services, or boundaries. Naming conflicts are architecture evidence.

Look for:

- synonyms used for one concept, like `Customer`, `Client`, and `Account`;
- one word used for different concepts in different flows;
- technical names that hide business meaning;
- context-specific words leaking into unrelated areas.

When a boundary problem appears, state the ownership direction:

```text
Billing owns invoice state; fulfillment must not update invoice columns.
Catalog owns provider import vocabulary; products use internal product language.
```

A boundary is not proven by folder size. It is proven by distinct language, rules, ownership, or lifecycle.

## Concerns

Concerns are for shared behavior with one clear responsibility. A concern included by one model is usually just an extracted private section with worse locality. A concern that mixes auditing, notifications, emails, and external calls is several responsibilities hiding behind one include.

Before keeping a concern, ask:

- Which multiple classes use it today?
- What invariant or behavior does it centralize?
- Can its behavior be tested through the including models?
- Does the concern name describe domain behavior, not a bucket of methods?

## Callbacks

Callbacks are fine for small local invariants and normalization. They become architectural friction when they hide business workflow.

Good callback uses:

- setting a default state;
- normalizing attributes;
- maintaining simple derived values;
- local lifecycle bookkeeping.

Poor callback uses:

- calling external APIs;
- starting multi-step workflows;
- making permission or policy decisions;
- mutating unrelated aggregates;
- causing behavior that callers cannot see from the public interface.

If callback behavior matters to the domain, prefer an explicit method, job, or domain object with a name the business recognizes.

A useful test: saving a record should not surprise callers with unrelated business side effects. If every save can send mail, call a provider, or mutate another aggregate, the workflow is hidden.

## External Systems and Foreign Language

Third-party APIs, legacy schemas, and upstream systems should not leak foreign names into the core domain unless the application is consciously conforming to that model.

Use an adapter or anti-corruption layer when:

- provider field names appear throughout models or views;
- external states are treated as internal domain states;
- provider error modes shape core control flow;
- switching or testing the provider requires touching business logic.

Translate at the seam. Keep provider vocabulary near the adapter and domain vocabulary inside the Rails app.

## Value Objects

Introduce a value object when a primitive carries business rules that are repeated or easy to violate.

Good candidates:

- money;
- date ranges;
- addresses;
- measurements;
- normalized email addresses;
- provider identifiers with validation rules.

A value object should validate itself, avoid mutation, and make invalid states hard to represent. Do not wrap a primitive just to make code look object-oriented.

## Tests and Interfaces

The public interface is the test surface. Good architecture lets tests exercise behavior through the same interface callers use.

When reviewing tests, ask:

- Does the test know private implementation steps?
- Would the test survive an internal refactor?
- Is the behavior tested through the model, controller, job, or domain object that owns it?
- Are there old tests for shallow modules that should disappear after a deeper interface exists?

Prefer fewer tests through a stable, deeper interface over many tests that pin implementation details.

## Refactoring Follow-Through

Architecture review identifies candidates; refactoring changes behavior-preserving structure. When implementing a chosen refactor:

- state the stable behavior that must not change;
- add or identify characterization coverage before moving production code;
- change one seam or ownership boundary at a time;
- run focused tests after each step;
- run the broader suite before declaring the refactor done.

Do not mix behavior changes with structural refactors. If the behavior also needs to change, finish the structure-preserving move first, then make the behavior change with its own tests.
