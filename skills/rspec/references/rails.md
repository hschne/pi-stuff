# RSpec Rails

## Establish the Rails Test Contract

Inspect the locked Rails and `rspec-rails` versions, `spec/rails_helper.rb`, support loading, inferred-spec-type settings, database isolation, the Active Job adapter, the Capybara driver, and nearby specs of the same type.

Require `rails_helper` when the example needs the Rails application; keep plain Ruby examples on `spec_helper` where the suite supports that separation. `rails_helper` also owns the guards worth knowing when a run aborts or a failure looks odd: `maintain_test_schema!` stops the run on a pending migration, `config.fixture_paths` (plural in current versions) locates fixtures, `file_fixture` reads from `spec/fixtures/files`, and `filter_rails_from_backtrace!` hides framework frames until you pass `--backtrace`.

The `:type` metadata, not the directory, is what mixes a spec type's behavior in. Directory inference is opt-in through `config.infer_spec_type_from_file_location!`, which current `rspec-rails` ships commented out of generated `rails_helper.rb` files and marks as legacy. With it off, a spec in the conventional directory gets none of that type's helpers and the failure reads as a missing method. Write explicit `type:` metadata; it works in every version. Map an unconventional directory with `config.define_derived_metadata(file_path: %r{/spec/serializers/}) { |metadata| metadata[:type] = :serializer }`.

Choose the highest Rails seam that proves the behavior:

- model or service specs for domain behavior with no HTTP boundary;
- request specs for routing, middleware, controller integration, authentication, rendered response, and persistence at the HTTP boundary;
- job or mailer specs for enqueue and delivery contracts and their observable work;
- system specs for user-visible behavior that depends on browser integration.

Do not add a lower-level spec merely to duplicate behavior already proven at the selected seam. Three seam constraints decide the choice more often than preference: controller specs stub views by default and drive one request per example, so header, middleware, and full-stack behavior belongs in a request spec; Capybara is unavailable in request specs, so browser interaction belongs in a feature or system spec; and the Rails routing harness cannot exercise every route, so a redirect route needs a request spec.

A helper spec exposes `helper` with the module under test, `ApplicationHelper`, and Rails' own helpers only — not other application helper modules and not controller-declared helper methods.

## Rails State and Integrations

Use the suite's factories or fixtures consistently, and create only the records the behavior needs. Reload records when the assertion depends on persisted state rather than the in-memory object. `rspec-rails` teaches verifying doubles about Active Record column methods, so `instance_double(Order, total: 5)` accepts attributes that would otherwise fail verification.

Match job and mail assertions to the contract: distinguish scheduling or enqueueing from performing and its side effects. `have_enqueued_job`, `have_enqueued_mail`, and their performed counterparts require the `:test` queue adapter; reach into adapter internals only when the adapter itself is under test.

For request and system behavior, assert durable user or API outcomes rather than controller instance state, generated HTML formatting, or incidental SQL. Synchronize asynchronous browser behavior through Capybara's waiting assertions instead of sleeps.

A system spec does not use the application's `ApplicationSystemTestCase`. Unless the spec or a `config.before(type: :system)` hook calls `driven_by`, it runs under Rails' default Selenium driver, and the suite needs a configured web server. System specs do run inside the per-example transaction, so they need no separate cleaning strategy.

Transactional isolation wraps each example and rolls it back. It does not cover records created by a context-scoped hook, work committed by another process or connection, or anything the application commits outside the example. Data created in `before(:context)` predates the transaction: delete it in `after(:context)`, and `reload` any object the examples keep, because the in-memory object does not know about the rollbacks around it. Check those cases before switching the suite to truncation, and give any cleanup-strategy change a probe that fails when state leaks across examples.

## Version-Sensitive Semantics

Spec types, metadata inference, fixture integration, transactional behavior, Active Job helpers, and system-spec drivers vary across Rails and `rspec-rails` versions, and a major `rspec-rails` bump tracks dropped Rails support: 8.x covers Rails 8.0 and 7.2, 7.x covers Rails 7.x, 6.x covers 6.1 through 7.1. Read the feature series matching the lockfile — replace `8-0` below with the installed `rspec-rails` series — and match the Rails guides to the application's Rails version.

- [RSpec Rails feature documentation](https://rspec.info/features/8-0/rspec-rails/)
- [RSpec Rails API documentation](https://rubydoc.info/gems/rspec-rails)
- [Rails testing guide](https://guides.rubyonrails.org/testing.html)

## Review Checks

- The helper and spec type match the integration being exercised, and the type is established by metadata the suite actually applies rather than by directory alone.
- The chosen seam proves behavior without duplicating framework internals.
- Persistence assertions distinguish in-memory state from committed data.
- Jobs and mailers distinguish enqueueing from execution or delivery.
- System specs rely on observable waiting, not fixed sleeps.
- Database, driver, and global Rails state are isolated under the suite's actual configuration.
