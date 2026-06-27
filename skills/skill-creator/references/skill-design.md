# Skill Design

The conceptual model behind a good skill. The authoring guide covers structure and style; this covers the _why_ — the levers that make a skill predictable and cheap.

A skill exists to wrangle determinism out of a stochastic system. **Predictability** — the agent taking the same _process_ every run, not producing the same output — is the root virtue. A brainstorming skill should predictably diverge; its tokens vary, its behaviour doesn't. Every lever below serves predictability.

## Invocation: the two loads

A skill is reached one of two ways, and each choice spends a different cost.

**Model-invoked** — the skill keeps its `description`, so the agent can fire it autonomously, and other skills can reach it. The human can still type its name too; model-invocation always _includes_ user reach. The cost is **context load**: the description sits in the context window every turn, spending tokens and attention whether or not the skill fires.

**User-invoked** — the description is stripped (`disable-model-invocation: true`), so only the human typing its name can invoke it; no other skill can reach it. The cost is **cognitive load**: the human is now the index that must remember the skill exists. Zero context load.

Pick model-invocation only when the agent must reach the skill on its own, or another skill must. If it only ever fires by hand, make it user-invoked and pay no context load. Cognitive load is not a cost to minimise blindly — it is the price of human agency. Spend it where human judgement matters; remove it where it doesn't.

When user-invoked skills multiply past what the human can remember, the cure is a **router skill**: one user-invoked skill that names the others and when to reach for each.

## Leading words

A **leading word** is a compact concept already living in the model's pretraining that the agent thinks with while running the skill — `lesson`, `tracer bullets`, `fog of war`, `red` (a loop that goes red on the bug). Repeated as a token (not restated as a sentence), it accumulates a distributed definition across the skill and anchors a whole region of behaviour in the fewest tokens, by recruiting priors the model already holds.

It serves predictability twice:

- **In the body** it anchors execution — the agent reaches for the same behaviour every time the word appears.
- **In the description** it anchors invocation — when the same word lives in your prompts, docs, and code, the agent links that shared language to the skill and fires it more reliably.

Coining your own word works only if you define it clearly, and a made-up word recruits no priors — you pay in definition tokens what a pretrained word gives free. Reach for an existing word first.

Hunt for places to collapse restatements into a leading word. "fast, deterministic, low-overhead" → a `tight` loop. "a loop you believe in" → the loop goes `red`. You win twice: fewer tokens, _and_ a sharper hook for the agent to hang its thinking on.

## Progressive disclosure

Material ranks by how immediately the agent needs it:

1. **In-skill step** — an ordered action in `SKILL.md`. The primary tier.
2. **In-skill reference** — a definition, rule, or fact in `SKILL.md`, consulted on demand.
3. **External reference** — reference pushed into a separate file, reached by a **context pointer**, loaded only when the pointer fires.

**Progressive disclosure** is the move down this ladder — out of `SKILL.md` into a linked file — so the top stays legible. The cleanest test is **branching**: each distinct way the skill is used is a branch. Inline what every branch needs; push behind a pointer what only some branches reach.

A **context pointer**'s _wording_, not its target, decides when and how reliably the agent reaches the material. A must-have file behind a weakly worded pointer is a variance bug: sharpen the wording first, and pull the material back inline only if that fails.

Once a piece sits on a rung, **co-locate** it: keep a concept's definition, rules, and caveats under one heading rather than scattered, so reading one part brings its neighbours with it.

## Completion criteria

Every step ends on a **completion criterion** — the condition that tells the agent the work is done. Make it _checkable_ (can the agent tell done from not-done?) and, where it matters, _exhaustive_ ("every modified module accounted for", not "produce a change list"). A vague criterion invites the agent to declare done and slip to the next step.

A demanding criterion also drives **legwork** — the digging the agent does within a step rather than offloading to the user. Raise it with a leading word (`comprehensive`, `relentless`) or a criterion that demands exhaustive work.

## Pruning

Keep each meaning in a **single source of truth** — one authoritative place, so changing the behaviour is a one-place edit.

Then hunt these failure modes:

- **No-op** — a line the model already obeys by default, so you pay load to say nothing. The test: does it change behaviour versus the default? A weak leading word (`be thorough` when the agent is already thorough-ish) is a no-op; the fix is a stronger word (`relentless`), not a different technique.
- **Duplication** — the same meaning in more than one place. Costs maintenance and tokens, and inflates a meaning's prominence past its real rank. The accidental inverse of a leading word, which repeats a _token_ on purpose, never the meaning.
- **Sediment** — stale layers that settle because adding feels safe and removing feels risky. The default fate of any skill without a pruning discipline.
- **Sprawl** — a skill simply too long, even when every line is live and unique. The cure is progressive disclosure: push reference behind pointers, and split by branch so each path carries only what it needs.
- **Premature completion** — ending a step before it's genuinely done, attention slipping to _being done_. Sharpen the completion criterion first (cheap, local); only if it is irreducibly fuzzy and you observe the rush, split the skill so the later steps are out of view.

Run the no-op test sentence by sentence. When a sentence fails, delete the whole sentence rather than trim words from it. Be aggressive — most prose that fails should go, not be rewritten.
