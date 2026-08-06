---
description: Run the guided Vienna.rb event preparation and promotion workflow
thinking: high
skill: vrb-event-flow
---

Run the `vrb-event-flow` skill for the user's request.

User request/context: $@

Follow the skill exactly. Resume incomplete state from `.agents/.vrb-event-flow/` when present, announce each phase, update `EVENT.md`, and stop at every approval gate.
