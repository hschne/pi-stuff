# Contrast Guide

How to diagnose and fix color contrast violations at the token level.

## Required Ratios (WCAG 2.2 AA)

| Element                                      | Minimum ratio  |
| -------------------------------------------- | -------------- |
| Normal text (<18pt / <14pt bold)             | 4.5:1          |
| Large text (≥18pt / ≥14pt bold)              | 3:1            |
| UI components (borders, icons, focus rings)  | 3:1            |
| Graphical objects (charts, meaningful icons) | 3:1            |
| Disabled / decorative elements               | No requirement |

"Large text" = 24px regular or 18.66px bold (CSS). In practice, most body text is normal; most headings above ~20px bold qualify as large.

## Diagnosing Contrast Failures

### From axe-core output

Axe reports `color-contrast` violations with the foreground color, background color, computed ratio, and the affected element selector. Example:

```
Ensures the contrast between foreground and background colors meets WCAG 2 AA
  Fix any of the following:
    Element has insufficient color contrast of 2.86:1
    (foreground: #76716a, background: #f4f1ea, font size 12pt, font weight 400)
```

Note the foreground/background hex values and the affected selector.

### From Lighthouse

Lighthouse flags contrast under the "Accessibility" section → "Background and foreground colors do not have a sufficient contrast ratio." Click the violation to see affected elements.

### From Chrome DevTools

Inspect the element → computed color values → the contrast ratio appears in the color picker with a pass/fail indicator.

## Fix Strategy: Tokens Over Selectors

Contrast problems usually stem from a theme token, not a one-off color. Fixing the token fixes every element that references it.

### Workflow

1. Identify the CSS custom property or SCSS variable the element's color comes from. Grep the codebase for the hex value if needed:

   ```bash
   grep -rn "#76716a" _sass/
   ```

2. Find all elements that use the same token. A token change affects them all — this is the point.

3. Adjust the token value to meet the required ratio against its most common background. Use a contrast checker:

   ```bash
   # Quick check with Node (requires wcag-contrast or similar):
   node -e "
     const [r1,g1,b1] = [0x72,0x6d,0x66];
     const [r2,g2,b2] = [0xf4,0xf1,0xea];
     const L = (r,g,b) => { const s = [r,g,b].map(c => { c /= 255; return c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4; }); return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2]; };
     const l1 = L(r1,g1,b1), l2 = L(r2,g2,b2);
     const ratio = (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
     console.log(ratio.toFixed(2) + ':1');
   "
   ```

4. Verify the new value still looks visually correct — muted text should stay muted, just darker/lighter enough to pass.

5. Check both light and dark themes if the project has them. A fix for light mode might break dark mode or vice versa.

## Token Fix Patterns

### SCSS variables

```scss
// Before: #76716a on #f4f1ea = ~3.3:1 (fail for normal text)
$color-text-tertiary: #76716a;

// After: #5e5a54 on #f4f1ea = ~4.8:1 (pass)
$color-text-tertiary: #5e5a54;
```

### CSS custom properties

```css
:root {
  /* Before */
  --color-text-tertiary: #76716a;
  /* After — darkened to pass 4.5:1 on --color-bg */
  --color-text-tertiary: #5e5a54;
}

[data-theme="dark"] {
  /* Adjust dark mode independently */
  --color-text-tertiary: #8a8680;
}
```

### Using color-mix() for derived colors

When a color is derived from a base, `color-mix()` keeps the palette coherent:

```css
:root {
  --color-text: #1a1a1a;
  /* 60% of text color = muted but still passes contrast on light bg */
  --color-text-tertiary: color-mix(
    in oklch,
    var(--color-text) 60%,
    transparent
  );
}
```

Verify the computed value still meets the ratio — `color-mix()` doesn't guarantee contrast.

## Common Trouble Spots

- **Tertiary/muted text**: Metadata, timestamps, captions, placeholder-like text. These are the most frequent contrast failures because designers push them toward the background.
- **Form field borders**: Need 3:1 against the background. Light gray borders on white often fail.
- **Focus indicators**: Need 3:1 against adjacent background. Default browser outlines usually pass; custom ones often don't.
- **Disabled states**: Exempt from contrast requirements, but if something _looks_ disabled but isn't actually `disabled`, it must still pass.
- **Dark mode**: A color that passes in light mode may fail in dark mode. Always check both.
