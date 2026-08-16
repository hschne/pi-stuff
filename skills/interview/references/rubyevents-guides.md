# RubyEvents Guides Interviews

## Paths and naming

- Source media: `~/Videos/RubyEvents Guides/`
- Site: `~/Source/guides/`
- Interview pages: `~/Source/guides/_interviews/`
- Speaker data: `~/Source/guides/_data/voices.yml`
- Avatars: `~/Source/guides/assets/images/avatars/`

Create `YY-MM-DD-<speaker-name>-<meetup-name>/` under the media directory. For multiple interviewees, include each name in primary-first order. Rename the files to the same base:

```text
26-07-20-julien-marseille-paris-rb/
├── 26-07-20-julien-marseille-paris-rb.mp4
├── 26-07-20-julien-marseille-paris-rb-mono.ogg
└── 26-07-20-julien-marseille-paris-rb-transcript.txt
```

Keep the original recording, mono audio, and raw transcript. Remove the transcription log after success.

## Context

Search the wiki for project and organizer context before transcription:

```bash
qmd search "<speaker> <meetup> RubyEvents Guides" -c projects -c areas -c resources -n 10 --md
```

Confirm the meetup site and RubyEvents profile. Use the RubyEvents profile for the avatar, X, and LinkedIn links when available.

## Transcription

`~/.scripts/transcribe` creates temporary mono audio for local media. Create the retained mono file first, then transcribe it:

```bash
cd "/home/hschne/Videos/RubyEvents Guides/<interview-folder>"
ffmpeg -i "<base>.mp4" -map 0:a:0 -ac 1 -c:a libvorbis "<base>-mono.ogg"
fnox exec -- ~/.scripts/transcribe "<base>-mono.ogg" \
  --output "<base>-transcript.txt" \
  --prompt "Interview between <host> and <speakers>, organizers of <meetup>. Include meetup-organizing topics, speaker roles, and Ruby community vocabulary." \
  --key-term "<speaker>" \
  --key-term "<meetup>" \
  --key-term "Ruby"
```

Repeat `--key-term "<speaker>"` for each interviewee.

Verify the transcript:

```bash
wc -l -w -c "<base>-transcript.txt"
head -n 10 "<base>-transcript.txt"
tail -n 10 "<base>-transcript.txt"
```

## Human sanitization checkpoint

Present paired samples in this format:

```markdown
### Raw

**Julien:** ...

### Proposed cleanup

**Julien:** ...
```

Use only first names in dialogue labels.

## Interview page

Read the latest comparable files in full before writing:

```bash
cd ~/Source/guides
cat _layouts/interview.html
cat interviews/index.md
cat _interviews/<comparable-interview-1>.md
cat _interviews/<comparable-interview-2>.md
cat _data/voices.yml
```

Follow the existing frontmatter and design. For multiple interviewees:

- title the page `Primary and Secondary on Event`
- use an ordered `voices` frontmatter list with the primary interviewee first
- keep that order in the source slug, title, links, and avatars

Add:

- the interview page under `_interviews/`
- one entry in `_data/voices.yml` per interviewee
- one avatar under `assets/images/avatars/` per interviewee
- meetup, RubyEvents profile, and any other relevant social links
- transcript highlights with unique anchors

## Verification

Build and check the diff first:

```bash
cd ~/Source/guides
bundle exec jekyll build
git diff --check
```

Start Jekyll in the background if nothing is running on port 4000:

```bash
if ! curl -fsS http://localhost:4000/ >/dev/null; then
  nohup bundle exec jekyll serve > /tmp/rubyevents-guides-jekyll.log 2>&1 &
fi
```

Use Playwright against `http://localhost:4000` to verify:

- the interview appears first in `/interviews/`
- the interview page renders at its permalink
