---
name: vrb-video-flow
description: "Edit Vienna.rb talk recordings through a preview-first workflow, then render approved final videos. Use only when explicitly invoked through /vrb-video-flow."
disable-model-invocation: true
---

# Vienna.rb Video Flow

Turn raw Vienna.rb recordings into individual talk videos. The bundled renderer owns the fixed intro; this workflow determines the per-video crop and talk boundaries.

## 1. Confirm Inputs

Identify the raw recordings, intro music, additional editing directions, and the matching `talk-*-1920x1080.png` files in `/home/hschne/Source/vienna.rb/assets/out`.

Ask the user to confirm that the generated assets are current and that each recording is mapped to the correct talk.

## 2. Inspect Each Recording

Use `ffprobe` for media metadata and FFmpeg contact sheets or extracted frames to inspect the beginning, middle, and end.

Determine:

- a fixed `WIDTH:HEIGHT:X:Y` crop that removes recording artifacts without cutting slide content;
- the source in-point and out-point;
- any spoken phrase on which the talk should begin or end.

For a spoken edit point, use `~/.scripts/transcribe` on the recording with the requested phrase supplied as context or a key term. It extracts mono audio itself. Use the timestamped transcript to locate the phrase, then refine the in-point with a short extracted clip when necessary.

## 3. Preview and Revise

Use the bundled renderer; inspect its current interface with `--help`:

```bash
/home/hschne/.pi/agent/skills/vrb-video-flow/scripts/render.sh --help
```

Render about 30 seconds of talk after the complete intro. Save the reviewable result beside the raw recording as `<stem>-preview.mp4`, not in `/tmp`.

Check the preview has video and audio streams, then ask the user to review the crop, spoken entry, transitions, and music level. Replace the preview after feedback. Do not start a full render before explicit approval.

## 4. Render and Verify

After approval, call the same renderer with the approved crop and in-point plus the final out-point. It will reuse the exact intro, audio mix, and encoding settings from the preview.

Verify the final beginning, middle, final seconds, streams, duration, and crop. Report the final path and any remaining concern. Never overwrite a raw recording.
