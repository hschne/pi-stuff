---
name: social-images
description: Create and verify social-media images, screenshot cards, branded previews, and Open Graph artwork. Use when a post needs new or modified media, when framing a screenshot for sharing, or when composing branded social artwork from HTML.
---

# Social Images

Create restrained social artwork while keeping the subject legible and the project identity clear.

## Core Rules

- Choose the output branch first: use an existing project renderer, frame a screenshot, or compose branded artwork in HTML.
- Inspect reference images, existing source templates, design tokens, and configured fonts before choosing a direction. Prior art is the house style.
- Confirm the target channels and dimensions. Do not assume one image works for every placement.
- Preserve source images unless review exposes a framing problem.
- Show a review render before capturing final custom artwork.
- Read every final image and verify dimensions, legibility, cropping, and balance.

## Use an Existing Project Renderer

Prefer a project's reproducible asset pipeline over rebuilding its design in this skill.

1. Inspect its README, task runner, asset configuration, templates, brand files, and prior generated examples.
2. Change only the presentation data and source images required for the requested asset.
3. Run the project's preview and present every relevant variant for review.
4. After approval, run its generation and lint tasks.
5. Read the generated files and verify them against the approved previews.

Completion: approved assets were generated through the project's own source-controlled pipeline and its checks pass.

## Frame a Screenshot

1. Resolve the source image:
   - Read a supplied image and confirm it contains the intended content.
   - For a page or application, use available browser automation to capture the requested state.
   - For a terminal, ask for a screenshot unless the environment provides a deterministic capture mechanism.
2. Frame it with the bundled script:

   ```bash
   <skill-dir>/scripts/frame-screenshot.sh INPUT.png -o OUTPUT.png
   ```

3. Read `OUTPUT.png` and check that no content is cropped, text remains legible, margins are balanced, and the background does not compete with the screenshot.

The default output is a 2400x1350 PNG with a restrained Tokyo Night blue-to-slate gradient. Adjust `--from` and `--to` only when the project calls for another palette.

## Compose Branded Artwork

Use HTML when the image needs project identity, typography, and art direction beyond simple framing.

1. Gather the required copy, canonical URL, brand assets, and source screenshot or video still.
2. Inspect prior artwork and source templates. Match their structural conventions while adapting the composition.
3. Write a retained source page such as `doc/social/index.html`:
   - fix the canvas to the approved target dimensions;
   - set `overflow: hidden`;
   - use project fonts with durable fallbacks;
   - reference local assets through relative paths;
   - keep important copy readable at thumbnail size;
   - keep meaningful content away from placement-specific crop and overlay areas.
4. Serve the page over HTTP so relative assets and fonts render consistently:

   ```bash
   (cd doc && python3 -m http.server 8917)
   ```

5. Resize the browser viewport to the exact canvas and capture a temporary review PNG at CSS-pixel scale.
6. Read and present the review image. Revise until approved.
7. Capture the approved viewport to the final asset path.
8. Stop the server and retain the HTML source beside the generated asset.

## Verification

Inspect exact dimensions:

```bash
identify OUTPUT.png
```

Then read the image and confirm:

- important text survives thumbnail display;
- copy has no accidental wrapping;
- people, screenshots, and logos are recognisable and intentionally cropped;
- no edge clipping looks accidental;
- the final file matches the approved render.

Return the absolute output path, dimensions, and retained source path when applicable.
