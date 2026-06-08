---
name: a11y
description: Audit web pages for accessibility issues and fix violations. Use when running accessibility checks, a11y audits, WCAG compliance scans, contrast checks, axe-core scans, Lighthouse accessibility scores, or fixing accessibility violations. Also use when reviewing keyboard navigation, focus management, screen reader compatibility, or ARIA correctness on a live page.
---

# Accessibility Audit & Fix

Run accessibility audits on web pages and fix violations systematically.

## Core Rules

- Target WCAG 2.2 Level AA — this covers all current legal requirements (EAA, ADA Title II, Section 508).
- Fix at the token/variable level (CSS custom properties, SCSS variables, theme files) rather than patching individual selectors. Upstream fixes prevent recurrence.
- Always re-run the audit after fixes to confirm zero violations before declaring done.
- Automated tools catch ~30-40% of issues. Complement with a manual keyboard walkthrough and the POUR checklist.
- Triage violations by severity: critical → serious → moderate → minor. Fix critical/serious before moving on.

## Audit Workflow

### 1. Run automated scan

Pick the tool that fits the situation:

| Tool                             | Command / Method                                   | Best for                         |
| -------------------------------- | -------------------------------------------------- | -------------------------------- |
| axe-core CLI                     | `bash <a11y-skill-dir>/scripts/axe-audit.sh <url>` | Fast CLI audit, parseable output |
| Lighthouse (Chrome DevTools MCP) | `run_lighthouse` via chrome-devtools MCP           | Full score with perf context     |
| Playwright MCP + axe             | Inject axe-core via `execute_javascript`           | Programmatic, multi-page sweeps  |

For a quick single-page check, use the axe-audit script. For an overall score, use Lighthouse. For scripted multi-page audits, inject axe via Playwright.

### 2. Triage violations

Group results by severity. For each violation note:

- The WCAG criterion it fails
- The affected elements/selectors
- Whether it's a token-level, component-level, or one-off issue

### 3. Load the relevant reference

Read the reference that matches the violation type before fixing:

| Topic         | When to Read                                      | Reference                                        |
| ------------- | ------------------------------------------------- | ------------------------------------------------ |
| checklist     | Full audit, pre-launch review, manual walkthrough | [audit-checklist](references/audit-checklist.md) |
| anti-patterns | Specific violations to understand and fix         | [anti-patterns](references/anti-patterns.md)     |
| contrast      | Color contrast failures, token adjustments        | [contrast-guide](references/contrast-guide.md)   |

### 4. Fix violations

- Identify the upstream source: theme token, base class, component partial, or one-off inline style.
- Apply the fix at the highest useful level. A token change in `theme.scss` beats patching 5 selectors.
- For contrast fixes, adjust the color value and verify the new ratio meets the minimum (4.5:1 normal text, 3:1 large text / UI components).
- For structural fixes (missing labels, heading gaps, landmark issues), follow the patterns in the HTML skill.

### 5. Re-run audit

Run the same tool from step 1. The audit must return zero critical/serious violations. If new violations appeared, repeat from step 2.

### 6. Manual spot-check

Automated tools miss interaction and flow issues. After the automated scan is clean:

1. **Keyboard walkthrough**: Tab through the entire page. Every interactive element must be reachable, have a visible focus indicator, and follow a logical order.
2. **Focus traps**: Open every modal/overlay, confirm Escape closes it and focus returns to the trigger.
3. **Skip link**: Verify the first focusable element is a skip-to-content link (if the page has repeated navigation).
4. **Zoom**: Zoom to 200% — content must reflow without horizontal scroll or clipping.
5. **Reduced motion**: Enable `prefers-reduced-motion` in DevTools and confirm animations are suppressed or toned down.

## When Not to Use This Skill

- **Building new markup from scratch** — use the `html` skill instead; it covers semantic patterns and ARIA.
- **Styling decisions** — use the `css` or `scss` skill; they cover focus-visible, reduced-motion, and color functions.
- This skill is for **auditing existing pages** and **fixing reported violations**.
