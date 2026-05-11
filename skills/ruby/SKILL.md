---
name: ruby
description: Modern Ruby language conventions and idioms. Use when writing, reviewing, or refactoring Ruby code — especially when using Ruby 3.x features like pattern matching, numbered parameters, or it.
---

# Ruby

Modern Ruby idioms and language features to prefer over older patterns.

## When to Use This Skill

- Writing or reviewing any Ruby code
- Choosing between Ruby language features
- Refactoring older Ruby patterns to modern equivalents

## Core Rules

- Prefer modern Ruby features over verbose equivalents when they improve clarity
- Do not use numbered parameters (`_1`, `_2`) — use `it` for single-argument blocks or named parameters for multi-argument blocks
- Never use single-letter variable or parameter names — always use descriptive names (`entry` not `e`, `options` not `o`, `user` not `u`)
- Use pattern matching for complex conditional destructuring instead of chains of `if`/`[]`

## Block Parameters

Use `it` (Ruby 3.4+) for single-argument blocks instead of named or numbered parameters.

**Good:**

```ruby
projects.map { ProjectSerializer.new(it).as_feed_item }
ids.filter { it > 0 }
```

**Bad:**

```ruby
projects.map { |p| ProjectSerializer.new(p).as_feed_item }
projects.map { ProjectSerializer.new(_1).as_feed_item }
```

Use named parameters when a block takes more than one argument or when the name meaningfully aids readability.

```ruby
hash.each { |key, value| ... }
```
