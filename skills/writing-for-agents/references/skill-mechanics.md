# Skill Mechanics

Skill-specific packaging, invocation, and creation workflow. Apply the universal writing and pruning rules from `SKILL.md` while using this reference.

## Package

```text
skill-name/
├── SKILL.md
├── agents/        # Specialized subagent instructions
├── scripts/       # Deterministic or repeatedly recreated work
├── references/    # Branch-specific documentation loaded on demand
└── assets/        # Output resources not loaded as instructions
```

`SKILL.md` is required. Add other directories only when they carry live material.

## Frontmatter

```yaml
---
name: my-skill
description: What the skill does. Use when the relevant branches occur.
---
```

- `name`: lowercase letters, digits, and hyphens; no leading, trailing, or consecutive hyphens; maximum 64 characters.
- `description`: maximum 1024 characters and no angle brackets.
- Front-load the leading concept and include one trigger per distinct branch.
- Put invocation conditions in the description because it is loaded before the body.

## Invocation

Invocation trades two loads:

- **Model-invoked:** keep a model-facing description. The agent and other skills can discover it, but its description consumes context on every turn.
- **User-invoked:** set `disable-model-invocation: true`. The description becomes a human-facing summary and only the human can invoke it, trading context load for the need to remember it.

Choose model invocation when autonomous discovery or cross-skill reach matters. Choose user invocation when human judgment should decide and automatic discovery adds little value.

When user-invoked skills become difficult to remember, use one user-invoked router skill that names them and their selection conditions. The router guides the human; it cannot autonomously invoke skills hidden from the model.

## Progressive Disclosure

For skills, the hierarchy has three loading costs:

1. Frontmatter is always loaded.
2. `SKILL.md` loads when invoked.
3. References load only when their pointers fire.

Keep `SKILL.md` under 500 lines. References should be one level deep and should not repeat their pointers or parent content. Give large references a table of contents or useful search terms.

## Creation and Revision

1. Extract known intent from the conversation before asking questions.
2. Resolve remaining gaps in capability, triggers, output, verification, and whether evals are useful.
3. Inspect overlapping skills and authoritative domain or tool documentation.
4. Draft using the ownership, hierarchy, pointer, and pruning workflow in `SKILL.md`.
5. Put repeated deterministic work in `scripts/` and run it successfully.
6. Validate the package:

   ```bash
   bash <writing-for-agents-dir>/scripts/validate_skill.sh <path-to-skill>
   ```

7. Exercise the skill on realistic prompts. Read [eval-guide.md](eval-guide.md) when formal comparison or trigger testing will provide useful evidence.
8. Improve from observed failures, generalizing beyond individual prompts and removing ineffective instructions before adding new ones.

**Complete when:** validation passes, the skill has been exercised, and each retained instruction has one authoritative owner.
