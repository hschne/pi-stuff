---
name: hill-chart
description: Generate a hill chart image for a project or work-item status update — shows whether work is still being figured out (uphill) or is in execution (downhill). Use when asked for a hill chart, a visual progress/status update, or to post one to Mattermost.
---

# Hill Chart

Use `GET https://hill.fractaledmind.workers.dev/` for usage instructions.

## Mattermost

Send the `/hill` command text itself as the message.

```
/hill Title | Label:percent, Label:percent
/hill Label:percent, !Checkpoint:percent
/hill Title | Label:percent --dark
```
`|` splits an optional title from the items.
`!` marks a checkpoint instead of a dot. 
`--dark` selects the dark theme.
