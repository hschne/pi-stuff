---
name: socials
description: Create polished social-media images from screenshots or custom HTML compositions. Use when framing a screenshot for sharing, capturing a page or terminal for social media, or designing a branded Open Graph or repository social-preview image with a project name, tagline, URL, and embedded product image.
---

# Social Images

Create restrained screenshot cards or custom branded social previews while keeping the product legible and the project identity clear.

## Core Rules

- Choose the output branch first: frame an existing screenshot, or compose a branded Open Graph image in HTML.
- Inspect reference images, existing OG HTML, design tokens, and configured fonts before choosing a visual direction. Prior art is the house style.
- Keep branded preview copy sparse. A project name, one-line description, and URL are usually sufficient.
- Show a review render before capturing the final branded image. Composition feedback is cheaper to apply in HTML than after handoff.
- Read the final image and verify dimensions, legibility, cropping, and balance.

## Frame a Screenshot

1. Resolve the source image:
   - Read a supplied image and confirm it contains the intended content.
   - For a page or application, load the `browser` skill and capture the requested state.
   - For a terminal, ask for a screenshot unless the environment provides a deterministic capture mechanism.
2. Frame it with the bundled script:

   ```bash
   <skill-dir>/scripts/frame-screenshot.sh INPUT.png -o OUTPUT.png
   ```

3. Read `OUTPUT.png` and check:
   - no content is cropped;
   - text remains legible;
   - margins are balanced;
   - corners and shadow render cleanly;
   - the background supports rather than competes with the screenshot.

The default output is a 2400×1350 PNG with a restrained Tokyo Night blue-to-slate gradient. Adjust `--from` and `--to` only when the project calls for another palette.

## Compose a Branded Open Graph Image

Use HTML when the image needs project identity, typography, and art direction beyond simple framing. HTML keeps layout, type, and screenshot bleed precise and easy to revise.

1. Gather the project name, one-line description, canonical URL, and product screenshot or video still.
2. Inspect any reference OG image and its source HTML. Match its structural conventions while adapting the composition to the current project.
3. Write a retained source page such as `doc/og/index.html`:
   - fix `html` and `body` to the target dimensions, commonly `1280×640` for GitHub;
   - set `overflow: hidden`;
   - use the project's configured font with durable fallbacks;
   - embed the screenshot through a relative path;
   - let the screenshot bleed or overlap when that gives the product enough visual weight;
   - keep the project name dominant and readable at thumbnail size.
4. Serve the page over HTTP so relative assets and fonts render consistently:

   ```bash
   (cd doc && python3 -m http.server 8917)
   ```

5. Use the `browser` skill to resize the viewport to the exact target dimensions and capture a temporary review PNG with CSS-pixel scaling.
6. Read the review PNG and present it for approval. Revise the HTML until approved.
7. Capture the approved viewport to the final asset path, for example `doc/assets/og.png`.
8. Stop the HTTP server and keep the HTML source beside the generated asset so future changes remain reproducible.

## Verification

Run an image inspector and confirm the exact output dimensions:

```bash
identify OUTPUT.png
```

Then read the image and check that:

- the project name survives thumbnail display;
- the copy has no accidental wrapping;
- the screenshot remains recognizable without dominating the identity;
- no edge clipping looks accidental;
- the final file matches the approved review render.

Return the absolute output path and note the retained HTML source when applicable.
