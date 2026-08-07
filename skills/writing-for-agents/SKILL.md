---
name: writing-for-agents
description: Write and prune documents consumed by agents. Use when creating, editing, or reviewing skills, AGENTS.md, CLAUDE.md, prompt instructions, or referenced agent documentation; when agent docs are verbose, duplicated, stale, or leak across boundaries; or when testing a skill's behavior and invocation.
---

# Writing for Agents

Write agent-facing documents that produce a predictable process without carrying unnecessary context.

## Core Rules

- **Single source of truth:** Give each meaning one authoritative owner. Other documents point to it instead of restating it.
- **Environment as source:** Let code, configuration, directory structure, and `--help` own facts the agent can retrieve cheaply. Document conventions, reasons, and gotchas that inspection cannot reveal.
- **Branch relevance:** Inline what every execution branch needs. Put branch-specific material behind a context pointer.
- **Co-location:** Keep a concept's definition, rules, and caveats together once it has an owner.
- **Checkable completion:** End procedural steps with a condition that distinguishes done from not done.
- **Positive direction:** State the target behavior. Reserve prohibitions for hard guardrails and pair them with the desired action.

## Workflow

### 1. Establish the Contract

Identify:

- The document's job and audience
- The tasks that should reach it
- Its distinct execution branches
- The expected action or output
- The verification or completion criteria

Read the complete document and the directly relevant documents it points to. For a new document, inspect nearby agent instructions and repository sources that may already own the material.

For skill work, load only the matching reference:

| Branch    | Trigger                                                                    | Reference                                           |
| --------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| Mechanics | Creating or restructuring a skill, or changing its packaging or invocation | [skill-mechanics.md](references/skill-mechanics.md) |
| Evals     | Testing skill behavior or optimizing its description                       | [eval-guide.md](references/eval-guide.md)           |
| Schemas   | Creating or reading eval, metadata, grading, or trigger JSON               | [schemas.md](references/schemas.md)                 |
| Grading   | Judging assertions against test outputs                                    | [grader.md](agents/grader.md)                       |

**Complete when:** every instruction under review has a defined purpose and candidate owner.

### 2. Map Ownership

Classify each instruction:

| Class     | Treatment                                                             |
| --------- | --------------------------------------------------------------------- |
| Step      | Keep in execution order when the agent must perform it                |
| Reference | Co-locate with the concept it governs                                 |
| Pointer   | Name the target and the branch that should load it                    |
| Cache     | Remove when the environment provides a cheap, reliable lookup         |
| Duplicate | Keep only in the authoritative owner                                  |
| Leak      | Move tool-, project-, or domain-specific detail to its specific owner |
| No-op     | Delete when it does not change behavior from the model's default      |
| Sediment  | Delete when history no longer affects current behavior                |

Duplication repeats a meaning; scattering separates parts of one meaning. Remove the former and co-locate the latter.

**Complete when:** every retained meaning has one owner and every non-owner has, at most, a pointer.

### 3. Build the Information Hierarchy

Place retained content at the narrowest useful scope:

1. **In-file step** — ordered action required on the current path.
2. **In-file reference** — rule or fact shared by the document's branches.
3. **Disclosed reference** — branch-specific material loaded through a context pointer.

Split by branch when tasks need different reference material. Split by sequence only when later visible steps repeatedly cause premature completion of an earlier, irreducibly fuzzy step.

A long document with live, unique content is **sprawl**. Cure it by narrowing execution paths, not by compressing unrelated material into denser prose.

**Complete when:** each branch loads the steps and reference it needs without carrying unrelated detail.

### 4. Write Context Pointers

A context pointer is always-loaded text that decides whether out-of-context material is read. Skill descriptions and links from `AGENTS.md` are pointers.

A pointer should:

1. Front-load the concept agents and users will recognize.
2. State what the target contains.
3. Name one trigger for each distinct branch.
4. Collapse synonyms that merely rename the same branch.
5. Omit identity already carried by the target.

Sharpen a weak pointer before copying target material into the parent document.

**Complete when:** every target is reachable from each intended branch without a synonym list.

### 5. Tighten Execution

Write commands for deterministic work and state the expected result. For work without a command, use a checkable, sufficiently demanding completion criterion.

Audit omissions in:

- Sequence
- Branch selection
- Output format
- Verification
- Handoff

Fill an omission when predictable behavior matters. Otherwise make the choice an explicit branch.

**Complete when:** the agent can tell what to do, which branch applies, and when the work is finished.

### 6. Prune Sentence by Sentence

Ask of every sentence:

1. Does it change behavior from the model's default?
2. Is it relevant to every branch that loads it?
3. Is this its authoritative owner?
4. Is the same fact cheaper to retrieve from the environment?
5. Is it current?

Delete a failed sentence rather than polishing it. Add material only to close a consequential gap in sequencing, selection, output, verification, or handoff.

**Complete when:** every retained sentence changes behavior and belongs on its current path.

### 7. Verify

Exercise the document on a realistic task. Verify the resulting process, not whether the output merely mentions the instructions.

For skills, follow the validation procedure in [skill mechanics](references/skill-mechanics.md). Use formal evals for objectively testable behavior. For subjective guidance, compare realistic outputs and ask for qualitative review.

**Complete when:** structural checks pass and observed behavior supports the document's contract.
