# Common Accessibility Anti-Patterns

The top violations ranked by real-world frequency. Each entry has a severity, WCAG reference, detection hint, and fix.

## Critical — Must fix before merge

### Missing alt text on informative images

**WCAG 1.1.1 (A)** — Detected by axe: `image-alt`

```html
<!-- Bad -->
<img src="chart.png" />

<!-- Good: informative -->
<img src="chart.png" alt="Revenue grew 30% in Q3" />

<!-- Good: decorative -->
<img src="divider.png" alt="" />
```

### Insufficient text contrast

**WCAG 1.4.3 (AA)** — Detected by axe: `color-contrast`

Fix at the token level. Minimum ratios: 4.5:1 for normal text, 3:1 for large text (≥18pt or ≥14pt bold). See [contrast-guide](contrast-guide.md) for token-level fix patterns.

### Input without associated label

**WCAG 1.3.1 (A), 3.3.2 (A)** — Detected by axe: `label`

```html
<!-- Bad -->
<input type="email" placeholder="Email" />

<!-- Good -->
<label for="email">Email address</label>
<input id="email" type="email" placeholder="you@example.com" />
```

Placeholder is a hint, not a label. Always pair with a visible `<label>`.

### Clickable div instead of button

**WCAG 2.1.1 (A), 4.1.2 (A)** — Detected by axe: `interactive-element-role`

```html
<!-- Bad: no focus, no keyboard, no role -->
<div onclick="submit()">Submit</div>

<!-- Good -->
<button onclick="submit()">Submit</button>
```

### Icon button without accessible name

**WCAG 4.1.2 (A)** — Detected by axe: `button-name`

```html
<!-- Bad -->
<button><svg>...</svg></button>

<!-- Good -->
<button aria-label="Close dialog"><svg aria-hidden="true">...</svg></button>
```

### aria-hidden on focusable element

**WCAG 4.1.2 (A)** — Detected by axe: `aria-hidden-focus`

A focusable element inside `aria-hidden="true"` creates a ghost that keyboard users reach but screen readers can't announce. Use `inert`, `hidden`, or `disabled` instead.

### Focus trap without escape

**WCAG 2.1.2 (A)** — Manual check

Modals must trap focus inside and release it on Escape. Use native `<dialog>` with `showModal()` — it handles trapping, Escape, and focus restoration. For custom modals: trap Tab, close on Escape, return focus to trigger.

## Serious — Fix in same sprint

### Heading level gaps

**WCAG 1.3.1 (A)** — Detected by axe: `heading-order`

Don't skip from `<h1>` to `<h3>`. Maintain logical nesting. Style headings with CSS, not by picking a different level.

### Missing page language

**WCAG 3.1.1 (A)** — Detected by axe: `html-has-lang`

```html
<html lang="en"></html>
```

### Focus outline removed without replacement

**WCAG 2.4.7 (AA)** — Detected by axe: `focus-visible` (partial)

```css
/* Bad */
*:focus {
  outline: none;
}

/* Good */
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

Never remove outline without providing an equally visible `:focus-visible` replacement.

### Non-descriptive link text

**WCAG 2.4.4 (A)** — Detected by axe: `link-name`

```html
<!-- Bad -->
<a href="/pricing">Click here</a>

<!-- Good -->
<a href="/pricing">View pricing plans</a>
```

### Error messages not linked to input

**WCAG 3.3.1 (A)** — Manual check

```html
<input
  id="email"
  type="email"
  aria-describedby="email-error"
  aria-invalid="true"
/>
<span id="email-error">Please enter a valid email address</span>
```

### Color as only indicator

**WCAG 1.4.1 (A)** — Manual check

Red text alone for errors isn't enough. Add an icon, prefix text ("Error:"), or border change alongside the color.

### Missing skip link

**WCAG 2.4.1 (A)** — Manual check

```html
<a href="#main" class="skip-link">Skip to main content</a>
<!-- ...navigation... -->
<main id="main">...</main>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
}
.skip-link:focus {
  top: 0;
}
```

### Missing live region for dynamic content

**WCAG 4.1.3 (AA)** — Manual check

Toast/notification components need `role="status"` (polite) or `role="alert"` (urgent errors). Don't move focus to toasts — let the live region announce them.

```html
<div role="status">Item saved successfully</div>
<div role="alert">Failed to save. Please try again.</div>
```

## Moderate — Plan for next iteration

### Redundant ARIA on native elements

**WCAG best practice** — Detected by axe: `aria-allowed-role`

`<button role="button">` is redundant. Native elements already carry their role.

### Animation without reduced-motion gate

**WCAG 2.3.3 (AAA, but best practice for AA)**

```css
@media (prefers-reduced-motion: no-preference) {
  .card {
    transition: transform 0.3s ease;
  }
}
```

### Fixed font sizes preventing resize

**WCAG 1.4.4 (AA)**

Use `rem` or `em` for content text. A `px` base on `html` is fine, but body text in `px` breaks user zoom.

### Small touch targets

**WCAG 2.5.8 (AA, new in 2.2)**

Interactive controls need at least 24×24 CSS px of target size or spacing. 44×44 px is the comfortable target for mobile.
