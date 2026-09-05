---
name: show-me
description: Explain the current topic visually with a focused diagram, code-shape sketch, diff, or HTML artifact. Use when the user invokes show-me to visualize code structure, control flow, data flow, UI composition, or a proposed change.
disable-model-invocation: true
---

# Show Me

Turn the current discussion point into the smallest visual that makes it clear. Skip the preamble and keep supporting prose brief.

## Choose the View

| Question                                                                            | View                                                     |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------- |
| How does this logic work?                                                           | Pseudocode                                               |
| What calls what at runtime?                                                         | Call tree                                                |
| How is the UI composed?                                                             | Component tree with relevant state and module boundaries |
| Which files own each responsibility?                                                | Shallow annotated file tree                              |
| What changes from the current shape?                                                | Diff shaped like the relevant tree, flow, or code        |
| How do participants, states, or data interact?                                      | Mermaid diagram                                          |
| Does the explanation need spatial layout, comparison, or several coordinated views? | Focused HTML artifact                                    |

Use several views only when each answers a different necessary part of the question.

## Build the Visual

1. Identify the exact question or unresolved decision from the conversation.
2. When the topic concerns existing code, inspect the relevant files and show only verified names, paths, calls, props, states, and boundaries.
3. Choose the smallest view from the table.
4. Put the visual next to the short text it supports.
5. Remove details that do not help answer the current question or compare the current options.

### Text Views

Use concise, copyable shapes:

```text
on(save)
  if content is unchanged
    return cached result
  write new content
  return fresh result
```

```text
<SessionPage>  apps/example/src/routes/session.tsx
  useSessionEvents()
  <SessionToolbar>
    <RunSkillButton>  packages/ui
```

```text
src/
├── commands/       # parses user actions
├── sessions/       # owns session state
└── transport/      # sends API requests
```

### Diffs

Use a diff when the existing shape is understood and the point is what changes. Match the diff to the topic rather than defaulting to source-code syntax.

```diff
 submitForm
   createSession
     persistPrompt
+    expandSkillMention
     launchAgent
-  navigateToSession
+  navigateToSession
+    subscribeToEvents
```

Show the complete block instead when most of it is new, omitted context would hide ownership or order, or the user needs a copyable target shape.

### Mermaid

Use Mermaid for interactions, transitions, dependencies, or data flow that become harder to follow as text. Include raw Mermaid source only when the user asks for it.

### HTML Artifacts

Use HTML only when text or Mermaid cannot clearly express the concept.

1. Inspect the product's existing tokens and visual language when the artifact represents a product UI.
2. Write one self-contained, responsive file. Use real labels and representative data; keep it focused on the current question.
3. Save it as `/tmp/show-me-{description}.html` unless the user wants a retained project artifact.
4. Open the file and inspect desktop and mobile layouts.
5. Report the file path and leave it open for the user when possible.

## Verify

Before responding, confirm that:

- the visual answers the current question without inventing project details;
- labels remain legible and the reading order is clear;
- omitted context does not hide a relevant owner, transition, or tradeoff;
- an HTML artifact renders without overflow or clipped content at desktop and mobile widths.
