# Skill Authoring Guide

## About Skills

Skills are modular, self-contained packages that extend the agent's capabilities by providing
specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific
domains or tasks—they transform the agent from a general-purpose agent into a specialized agent
equipped with procedural knowledge that no model can fully possess.

### What Skills Provide

1. Specialized workflows - Multi-step procedures for specific domains
2. Tool integrations - Instructions for working with specific file formats or APIs
3. Domain expertise - Company-specific knowledge, schemas, business logic
4. Bundled resources - Scripts, references, and assets for complex and repetitive tasks

## Core Principles

### Concise is Key

The context window is a public good. Skills share the context window with everything else the agent needs: system prompt, conversation history, other Skills' metadata, and the actual user request.

**Default assumption: the agent is already very smart.** Only add context the agent doesn't already have. Challenge each piece of information: "Does the agent really need this explanation?" and "Does this paragraph justify its token cost?"

Prefer concise examples over verbose explanations.

### Set Appropriate Degrees of Freedom

Match the level of specificity to the task's fragility and variability:

**High freedom (text-based instructions)**: Use when multiple approaches are valid, decisions depend on context, or heuristics guide the approach.

**Medium freedom (pseudocode or scripts with parameters)**: Use when a preferred pattern exists, some variation is acceptable, or configuration affects behavior.

**Low freedom (specific scripts, few parameters)**: Use when operations are fragile and error-prone, consistency is critical, or a specific sequence must be followed.

### Anatomy of a Skill

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   └── description: (required)
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code (Python/Bash/etc.)
    ├── references/       - Documentation loaded into context as needed
    └── assets/           - Files used in output (templates, icons, fonts, etc.)
```

#### Scripts (`scripts/`)

Executable code for tasks that require deterministic reliability or are repeatedly rewritten.

- Include when the same code is being rewritten repeatedly or deterministic reliability is needed
- Token efficient, deterministic, may be executed without loading into context

#### References (`references/`)

Documentation intended to be loaded as needed into context.

- Use for database schemas, API docs, domain knowledge, company policies, detailed workflow guides
- Keeps SKILL.md lean, loaded only when needed
- If files are large (>10k words), include grep search patterns in SKILL.md
- Information should live in either SKILL.md or references, not both

#### Assets (`assets/`)

Files not intended to be loaded into context, but used in the output the agent produces.

- Templates, images, icons, boilerplate code, fonts, sample documents

### Progressive Disclosure

Skills use a three-level loading system:

1. **Metadata (name + description)** - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words)
3. **Bundled resources** - As needed by the agent

Keep SKILL.md body under 500 lines. Split content into separate files when approaching this limit. Reference split-out files clearly from SKILL.md.

**Pattern 1: High-level guide with references**

```markdown
# PDF Processing

## Quick start

[code example]

## Advanced features

- **Form filling**: See [FORMS.md](references/FORMS.md)
- **API reference**: See [REFERENCE.md](references/REFERENCE.md)
```

**Pattern 2: Domain-specific organization**

```
bigquery-skill/
├── SKILL.md (overview and navigation)
└── references/
    ├── finance.md
    ├── sales.md
    └── product.md
```

## Writing Guidelines

### Frontmatter

```yaml
---
name: skill-name
description: "What the skill does and when to use it. Include triggers here — the body is only loaded after triggering."
---
```

- `name`: lowercase, hyphens only
- `description`: primary triggering mechanism — include all "when to use" information here

### Body

- Use imperative/infinitive form
- Only include information the agent doesn't already have
- Prefer concise examples over verbose explanations

### Naming

- Lowercase letters, digits, and hyphens only
- Prefer short, verb-led phrases
- Namespace by tool when it improves clarity (e.g., `gh-address-comments`)
- Name the skill folder exactly after the skill name

### What to NOT Include

Do not create extraneous files: README.md, INSTALLATION_GUIDE.md, QUICK_REFERENCE.md, CHANGELOG.md, etc.

## Anti-Patterns

Avoid:

- Vague names like `helper` or `utils`
- First-person descriptions like `I can help...`
- Bloated SKILL.md files that should be split into references
- Nested references several files deep
- Offering many equivalent options without guidance
- Undocumented magic values or unexplained scripts
