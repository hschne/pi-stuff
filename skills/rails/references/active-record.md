# Active Record

This reference covers Active Record query patterns and database interaction conventions.

## Use `pluck` to Materialize Attribute Lists

**Use `.pluck(:name)` instead of `.map(&:name)` on a relation.** `map` loads full records into memory just to read one column; `pluck` selects only that column in SQL.

**Bad:**

```ruby
project.entries.map(&:name)
```

**Good:**

```ruby
project.entries.pluck(:name)
```

This is the opposite case from the rule below: reach for `pluck` when you want the values; reach for a subquery when you only need the IDs to feed another query.

## Prefer Subqueries Over `pluck` + `WHERE IN`

**Use `.select(:id)` subqueries instead of `.pluck(:id)` followed by `WHERE IN (...)`.**

Plucking IDs materializes them into a Ruby array, then sends them back as a literal list. This is slower, uses more memory, and breaks on large datasets. A subquery keeps everything in SQL.

**Bad:**

```ruby
ids = project.entries.pluck(:id)
Vote.where(entry_id: ids).delete_all
```

Generates: `SELECT id FROM entries WHERE ...` → Ruby array → `DELETE FROM votes WHERE entry_id IN (1, 2, 3, ...)`

**Good:**

```ruby
Vote.where(entry_id: project.entries.select(:id)).delete_all
```

Generates: `DELETE FROM votes WHERE entry_id IN (SELECT id FROM entries WHERE ...)`

**When you must materialize:** If the association is destroyed or mutated before the subquery is evaluated (e.g. inside a transaction that deletes join records), the lazy subquery will return nothing. In that case either reorder operations so the subquery runs first, or fall back to `.pluck`/`.ids` before the mutation.

```ruby
# Option A: reorder so subquery evaluates before the join records are destroyed
transaction do
  Entry::Pending.where(entry_id: entries.select(:id)).destroy_all
  guest_entries.destroy_all  # now safe — subquery already evaluated
end

# Option B: materialize when reordering isn't possible
entry_ids = entries.ids
transaction do
  guest_entries.destroy_all
  Entry::Pending.where(entry_id: entry_ids).destroy_all
end
```
