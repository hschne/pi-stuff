---
name: skill-creator
description: Create or update skills. Use when designing, structuring, or packaging skills with scripts, references, and assets.
---

# Skill Creator

Create effective, concise skills that extend the agent's capabilities.

## Workflow

1. **Understand** — gather concrete usage examples and triggers
2. **Plan** — identify reusable resources (scripts, references, assets)
3. **Create** — write SKILL.md with frontmatter, add resources
4. **Validate** — test on real tasks, iterate

## Skill Structure

```
skill-name/
├── SKILL.md              # Required: frontmatter + instructions
├── scripts/              # Optional: executable code
├── references/           # Optional: docs loaded on demand
└── assets/               # Optional: templates, images, etc.
```

## SKILL.md Template

```yaml
---
name: my-skill
description: "What it does and when to use it. Include all triggers here."
---
```

```markdown
# Skill Name

One-line purpose.

## Core Rules

- Rule
- Rule

## Workflow

1. Step
2. Step

## References

| Topic | Description     | Reference                    |
| ----- | --------------- | ---------------------------- |
| guide | When to read it | [guide](references/guide.md) |
```

## Core Rules

- Keep SKILL.md under 500 lines — move details to `references/`
- Put all "when to use" info in the frontmatter `description`, not the body
- References one level deep only — no chains
- Prefer examples over prose
- Test scripts by running them before shipping

## References

Read the authoring guide for principles, progressive disclosure patterns, and anti-patterns:

| Topic     | Description                                                       | Reference                                        |
| --------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| authoring | Principles, structure, progressive disclosure, writing guidelines | [authoring-guide](references/authoring-guide.md) |
