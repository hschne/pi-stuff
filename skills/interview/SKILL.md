---
name: interview
description: "Process recorded interviews from media through contextual transcription, conservative sanitization, human review, and publication. Use when transcribing an interview, turning a recording or transcript into an interview page, cleaning interview dialogue without changing intent, or running the RubyEvents Guides interview workflow."
disable-model-invocation: true
---

# Interview

Turn a recorded conversation into a faithful, readable, reviewable interview.

## Core Rules

- Preserve the raw recording and raw transcript as the source of truth.
- Treat sanitization as copyediting: remove only distracting filler, false starts, repetition, placeholders, and obvious grammar or transcription errors while preserving meaning, sequence, specificity, and voice.
- Use a human checkpoint before the full sanitization pass. Edit a representative sample, show raw and edited versions, and agree on the degree of cleanup.
- Mark uncertain names or phrases for review. Verification is safer than a plausible guess.
- Do not ask about or infer accents or native languages by default. Use them only when the user supplies them or they are needed to resolve transcription ambiguity.
- Keep transcript speaker labels consistent and follow the destination project's existing interview structure.

## Workflow

1. **Inspect**
   - Read local instructions and at least two recent comparable published interviews in full.
   - Identify the recording date, speakers, event or subject, destination, naming convention, and verification commands.

2. **Organize sources**
   - Create one dated interview folder.
   - Keep the original recording, extracted audio, and raw transcript together.
   - Remove temporary logs only after transcription succeeds.

3. **Gather context**
   - Confirm speaker names, roles, organizations, domain vocabulary, and relevant links from authoritative sources.
   - Use this context in the transcription prompt and as a fact-checking aid.

4. **Transcribe**
   - Run the configured transcription tool with diarization, a contextual prompt, and key terms.
   - Verify that the output is non-empty, covers the recording duration, and distinguishes the speakers.

5. **Calibrate sanitization with the human**
   - Match the cleanup intensity of the comparable interviews.
   - Select 5–10 representative exchanges containing filler, repetition, spoken grammar, and proper nouns.
   - Produce a conservative edited sample beside the raw text.
   - Ask the human to approve or adjust the cleanup level before editing the full transcript.

6. **Sanitize**
   - Apply the approved cleanup level consistently.
   - Retain concrete examples, qualifications, jokes, disagreement, uncertainty, and the speaker's characteristic phrasing.
   - Compare each edited passage with the raw transcript; every factual claim and opinion should trace directly to the source.

7. **Publish**
   - Follow existing pages for frontmatter, speaker labels, links, images, highlights, and anchors.
   - Keep the raw transcript outside the published page for later review.

8. **Verify**
   - Run the destination project's build and formatting checks.
   - Inspect the published page and listing in a browser at desktop and mobile widths.
   - Check speaker labels, links, anchors, images, console errors, and missing content.
   - Report output paths and any uncertain transcript passages still requiring human review.

## References

Read the reference that matches the destination:

| Topic             | When to Read                                                                      | Reference                                            |
| ----------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| RubyEvents Guides | Processing a Ruby meetup or conference organizer interview for `~/Source/guides/` | [RubyEvents Guides](references/rubyevents-guides.md) |
