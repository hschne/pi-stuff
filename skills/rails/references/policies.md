# Policies

## Record Type

Policies should receive their own record type. Do not pass a different record and branch with `is_a?`.

Good:

```ruby
@vote = current_user.votes.find_or_initialize_by(idea: @idea)
authorize @vote
```

Bad:

```ruby
authorize @idea, policy_class: VotePolicy
```

## Authorize Return Value

Use the return value from `authorize` directly when it improves clarity.

```ruby
@idea = authorize(@project.ideas.find(params[:id]))
```

## Alias Similar Policy Methods

Prefer `alias_method` for actions that share the same rules.

```ruby
def create?
  user.present?
end
alias_method :new?, :create?
```

## Policy Namespacing

When the same model has different authorization rules depending on context, use Pundit namespaced policies. The top-level policy is the canonical default. Namespaced policies handle scoped contexts.

```text
app/policies/
├── entry_policy.rb          # EntryPolicy — default
├── vote_policy.rb           # VotePolicy — default
└── projects/
    ├── entry_policy.rb      # Projects::EntryPolicy — project-scoped
    └── vote_policy.rb       # Projects::VotePolicy — project-scoped
```

### Namespace resolution via controller hierarchy

Define a `pundit_namespace` hook in `ApplicationController`, override it in namespaced base controllers. Controllers just call `authorize(record)`.

```ruby
class ApplicationController < ActionController::Base
  include Pundit::Authorization

  private

  def pundit_namespace(record) = record
  def authorize(record, ...) = super(pundit_namespace(record), ...)
  def policy_scope(scope, ...) = super(pundit_namespace(scope), ...)
end

module Projects
  class ApplicationController < ::ApplicationController
    private

    def pundit_namespace(record) = [:projects, record]
  end
end
```

**Good:**

```ruby
# Resolves to EntryPolicy or Projects::EntryPolicy based on controller hierarchy
authorize @entry
```

**Bad:**

```ruby
# Repeating namespace arrays at every call site
authorize([:projects, @entry])
authorize([:standalone, @entry])
```
