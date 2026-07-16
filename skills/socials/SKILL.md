---
name: socials
description: Frame screenshots as polished social-media images with a restrained gradient background, rounded panel, and soft shadow. Use when the user provides an image to prepare for social media, asks to turn a screenshot into a social card, or asks to capture a page or terminal and frame it for sharing.
---

# Social Screenshot

Turn a supplied or newly captured screenshot into a clean 16:9 social card while keeping the screenshot itself as the focus.

## Core Rules

- Use `scripts/frame-screenshot.sh` for deterministic framing.
- Preserve the screenshot's aspect ratio and legibility.
- Default to the restrained Tokyo Night blue-to-slate gradient. Treat the background as framing, not decoration.
- Keep the rounded panel and soft shadow subtle enough that they do not compete with the content.
- Return the absolute output path and preview the result before handoff.

## Workflow

1. Resolve the source image:
   - For a supplied file, read it first and confirm it contains the intended content.
   - For a page or application, load the `browser` skill, capture the requested state, and use that screenshot.
   - For a terminal, ask for a screenshot unless the active environment provides a capture mechanism.
2. Frame it:

   ```bash
   <skill-dir>/scripts/frame-screenshot.sh INPUT.png -o OUTPUT.png
   ```

3. Read `OUTPUT.png` and check:
   - no content is cropped;
   - text remains legible;
   - margins are balanced;
   - corners and shadow render cleanly;
   - the gradient is understated.
4. Adjust `--from` and `--to` only when the user requests another palette. Run the script again and preview the new output.
5. Report the absolute path to the final PNG.

## Output

The default output is a 2400×1350 PNG suitable for common 16:9 social previews. When `-o` is omitted, the script writes `<input-name>-social.png` next to the input.
