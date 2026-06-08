# POUR Audit Checklist

Use this checklist for full-page audits or pre-launch accessibility reviews. Work through each section; tick items as you verify them. Items marked **(auto)** are caught by axe-core/Lighthouse; the rest require manual review.

## Perceivable

- [ ] All informative images have descriptive `alt` text; decorative images use `alt=""` **(auto)**
- [ ] Videos have synchronized captions (`<track kind="captions">`)
- [ ] Page uses semantic landmarks: `<header>`, `<nav>`, `<main>`, `<footer>` **(auto)**
- [ ] Headings follow logical hierarchy — no skipped levels (h1 → h2 → h3) **(auto)**
- [ ] Normal text contrast ≥ 4.5:1; large text contrast ≥ 3:1 **(auto)**
- [ ] UI component contrast (borders, icons, focus indicators) ≥ 3:1
- [ ] Information is not conveyed by color alone (add icon, text, or pattern)
- [ ] Content reflows at 320px width without horizontal scroll
- [ ] `<html lang="...">` is set and matches the content language **(auto)**
- [ ] Text is resizable to 200% without loss of content or functionality
- [ ] Hover/focus popups are dismissible, hoverable, and persistent

## Operable

- [ ] All interactive elements reachable and activatable via keyboard
- [ ] No keyboard traps — Escape closes overlays, Tab always moves forward
- [ ] Skip link present as the first focusable element **(partially auto)**
- [ ] Focus indicator visible on every interactive element (check `:focus-visible`)
- [ ] Focus order matches visual reading order **(auto)**
- [ ] Focus not obscured by sticky headers, footers, or overlays
- [ ] Focus returns to trigger after modal/overlay close
- [ ] Touch targets ≥ 24×24 CSS px (WCAG 2.2)
- [ ] Non-essential animations respect `prefers-reduced-motion`
- [ ] No content flashes more than 3 times per second
- [ ] Drag-and-drop has a click/tap alternative (WCAG 2.2)

## Understandable

- [ ] Every form input has an associated `<label>` or `aria-label` **(auto)**
- [ ] Error messages linked to inputs via `aria-describedby` with `aria-invalid="true"`
- [ ] Required fields use HTML `required` or `aria-required="true"` **(auto)**
- [ ] On submit failure, focus moves to first error or error summary
- [ ] No unexpected context changes on focus or input change
- [ ] Error messages include the field name and a corrective instruction
- [ ] Consistent help mechanisms appear in the same relative position across pages (WCAG 2.2)
- [ ] Authentication doesn't require a cognitive function test; paste and autofill allowed (WCAG 2.2)

## Robust

- [ ] All interactive elements have an accessible name, role, and state **(auto)**
- [ ] ARIA roles have all required properties (e.g., `tab` has `aria-selected`) **(auto)**
- [ ] No `aria-hidden="true"` on focusable elements **(auto)**
- [ ] Dynamic content updates announced via `aria-live` or `role="status"`/`role="alert"`
- [ ] SPA route changes announced to screen readers
- [ ] No redundant ARIA on native HTML elements (e.g., `role="button"` on `<button>`) **(auto)**
- [ ] Every ARIA id reference (`aria-labelledby`, `aria-describedby`, `aria-controls`) points to an existing element **(auto)**
