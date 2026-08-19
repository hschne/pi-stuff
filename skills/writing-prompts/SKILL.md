---
name: writing-prompts
description: Write, review, and prune prompts for coding agents and LLM workflows. Use for task prompts, autonomous goals, slash-command instructions, evaluator conditions, and reusable prompt templates, including prompts that are vague, over-prescriptive, unverifiable, or length-constrained.
---

# Writing Prompts

A good agent prompt defines the contract, not the implementation script. Specify the outcome, evidence, and boundaries tightly enough to protect the result, then leave discovery and implementation to the agent.

## Workflow

### 1. Identify the Runtime

Determine:

- The target model, agent, command, and harness
- Whether execution is interactive, autonomous, evaluator-driven, or reusable
- Which tools and repository context the agent can inspect
- Any hard input, character, time, or turn limits

When behavior depends on a named product, model, or command, check its current official documentation. Prefer first-party sources and verify evaluator semantics, tool access, persistence, and limits rather than relying on memory.

**Complete when:** the consumer, execution mode, available context, and applicable limits are known.

### 2. Establish the Contract

Extract:

- **Objective:** the state to change
- **Motivation:** why it matters, only when this affects decisions
- **Scope:** where the work belongs
- **Deliverable:** code, assessment, artifact, message, or other output
- **Success evidence:** commands, measurements, files, or observable state
- **Constraints:** qualities and boundaries that must survive the work
- **Fallback:** an evidence-backed stopping condition for uncertain targets

Separate aspirations from hard requirements. Give uncertain targets a legitimate stopping condition without turning it into an easy exit.

**Complete when:** success, failure, and each legitimate stopping condition are distinguishable.

### 3. Assign Information Ownership

Let the prompt own user intent and facts unavailable elsewhere. Let the environment own discoverable details such as exact commands, branch names, file layout, dependencies, and local conventions.

Point the agent to repository instructions instead of copying them. Inline an environmental fact only when discovering it is unreliable or the task depends on overriding it.

Classify each proposed instruction as objective, evidence, boundary, required sequence, context, or output. Remove it when it merely repeats another instruction, caches a cheap environmental fact, chooses an unapproved implementation, or does not change behavior.

**Complete when:** each retained instruction has one purpose and one authoritative location.

### 4. Calibrate Autonomy

Prescribe:

- Measurable outcomes
- Required evidence
- Hard safety and scope boundaries
- Steps whose order affects validity, such as measuring a baseline before editing
- User decisions the agent is not authorized to make

Leave the agent to choose:

- Repository-conforming names and exact commands
- Diagnostic tools and implementation techniques
- Work decomposition and subagent count
- Reversible tactical decisions supported by evidence

Present tools, articles, and possible solutions as leads rather than mandates unless the user has selected them. Delegate subagents by independent responsibility, not by an arbitrary number or a diagnosis made before investigation.

**Complete when:** the prompt prevents invalid results without scripting work the agent can determine itself.

### 5. Make Evidence Visible

Specify how claims will be verified. For comparisons, define enough of the protocol to make the before and after states comparable without dictating irrelevant mechanics.

If a separate evaluator cannot use tools or inspect files, require decisive evidence to be surfaced in the conversation. If the deliverable is an external artifact, require its reference and completion evidence to be surfaced as well.

Ground long-run progress in tool output. Ask for decisions and supporting evidence, not hidden chain-of-thought or reproduced internal reasoning.

**Complete when:** the user or evaluator can verify completion from evidence they can access.

### 6. Write in Execution Order

Prefer this hierarchy:

1. Objective and measurable end state
2. Scope and important context
3. Required ordering
4. Quality and safety constraints
5. Verification
6. Deliverable and fallback

Use positive direction with reasons. Reserve prohibitions for real guardrails. Replace empty intensifiers such as “be thorough,” “use best practices,” and “do your best” with observable requirements or remove them.

Do not add a role when the harness already establishes one. Use examples only when output shape or edge-case behavior remains ambiguous after direct instructions.

### 7. Adapt to the Execution Branch

#### Interactive prompts

Ask only for missing information that materially changes the result. Leave reversible implementation choices to the agent.

#### Autonomous prompts

Define when the agent may proceed, when it must stop, and which external actions are excluded. Avoid instructions that require mid-run user replies unless the task genuinely cannot continue without them.

#### Evaluator-driven goals

Use one measurable end state, a stated check, and material constraints. Account for what the evaluator can observe. Bound the run with a fallback, time, or turn condition when the primary target may be impossible.

#### Reusable templates

Separate stable instructions from variable inputs. Delimit untrusted or long inputs clearly. Define defaults and required variables, and avoid embedding project facts that will become stale.

### 8. Define the Handoff

For a new prompt, return complete copy-ready text. For a review, lead with the assessment, name only consequential changes, and provide the complete revision rather than making the user assemble edits.

Honor the requested delivery boundary. If the target agent must produce an artifact or external action, name the destination and the evidence the user will receive.

**Complete when:** the user can use the prompt directly and knows what the target agent will return.

### 9. Prune and Verify

Review for:

- Vague success criteria
- Contradictory constraints
- Hidden architecture decisions
- Duplicated repository guidance
- Premature diagnosis
- Unnecessary implementation menus
- Evidence the evaluator cannot access
- Missing fallback or handoff
- Unverified length limits

Read the final prompt as the target agent: can it tell what success is, what evidence proves it, what it may decide, and when it must stop? Exercise it on a representative input; for a review, compare the original and revised expected behavior.

When a limit applies, count the exact submitted text, including command prefixes and newlines, and leave margin below the boundary.

**Complete when:** the prompt fits its runtime, produces the intended process on a realistic case, has no contradictory completion paths, and every retained sentence changes behavior.

## Minimal Template

```text
[Command, if any] In [scope], achieve [measurable outcome].

[Motivation that affects decisions.]

Before changing anything, [required baseline or context step].

Requirements:
- [Quality or safety boundary]
- [Evidence requirement]
- [External action boundary]

Verify completion by [accessible checks]. Surface [decisive evidence] for the user or evaluator.

Deliver [output or artifact]. If [ambitious target] cannot be reached safely, [evidence-based fallback].
```
