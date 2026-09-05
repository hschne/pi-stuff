# Visual Browser Inspection

Use browser developer tools when the user explicitly requests visual verification or when rendered behavior, JavaScript, network activity, DOM structure, or computed styles are material to the change.

## Workflow

1. Open the running feature at the relevant URL.
2. Exercise the affected success and failure paths as a user would.
3. Inspect console output and failed network requests after each path.
4. Inspect rendered DOM and computed styles when structure or layout is in question.
5. Capture screenshots for states that need review or durable evidence.
6. Fix observed errors, then repeat the same interaction.

Record the URL, tested interaction, viewport when relevant, console/network result, and screenshot path.

**Complete when:** the affected paths work in the rendered application, no related console or network failures remain, and visual evidence matches the implemented state.
