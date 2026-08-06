# Event Workflow File

Use one Markdown file as the human-readable source of workflow state:

```text
.agents/.vrb-event-flow/<event-number>/EVENT.md
```

Update it after every phase and approval. Preserve prior decisions; append corrections or replace superseded draft text clearly.

```markdown
# Vienna.rb #[number]: [title]

Status: Brief | Asset review | Promotion review | Event form review | Final campaign review | Complete
Current phase: [phase]
Next action: [single concrete action]

## Approval Gates

- [ ] Assets and provisional promotion approved
- [ ] Meetup and Luma forms approved for publication
- [ ] Final Buffer campaign approved for scheduling

## Event

| Field             | Value                   |
| ----------------- | ----------------------- |
| Number            |                         |
| Title             |                         |
| Date              | Thursday, DD Month YYYY |
| Starts            | HH:MM Europe/Vienna     |
| Ends              | HH:MM Europe/Vienna     |
| Capacity          |                         |
| Price             | Free                    |
| Organizer contact |                         |

## Venue

- Name:
- Address:
- Website:
- Access instructions:

## Sponsor

- Name:
- Website:
- Logo source:
- Local logo:

## Speakers and Talks

### [Speaker]

- Profile:
- Avatar source:
- Local avatar:
- Talk: [title]
- Description:

## Agenda and Description

[Confirmed event format, agenda, standard sections, and special announcements.]

## Outputs

- Asset preview: http://localhost:4321
- Generated assets:
- Promotion document:
- Media manifest: out/media.json

## Published Events

- Meetup ID:
- Meetup URL:
- Luma ID:
- Luma URL:

## Buffer Campaign

- Organization:
- X channel:
- Bluesky channel:
- LinkedIn channel:
- Capacity check:
- Scheduled post IDs:

## Verification

- [ ] Asset generation and lint passed
- [ ] Public R2 media fetched successfully
- [ ] X and Bluesky limits passed
- [ ] Buffer capacity passed before mutation
- [ ] Every scheduled post read back successfully

## Residual Issues

None.
```
