# Wiki Structure

Use this reference when deciding where a document belongs in `~/Documents/Wiki/`.

## Collection Layout

```text
~/Documents/Wiki/
  projects/<name>/
    memory/         # Session logs and session summaries
    specs/          # Plans or specifications
  areas/<name>/
    memory/          # Session logs and session summaries
  resources/<topic>/
    memory/          # Session logs and session summaries
  archive/           # Inactive or historical material
```

## Collection Rules

| Collection  | Use for                                                | Default search             |
| ----------- | ------------------------------------------------------ | -------------------------- |
| `projects`  | Active project files and project-specific documents    | yes                        |
| `areas`     | Ongoing domains like community, writing, or life admin | yes                        |
| `resources` | Reusable references, runbooks, and research            | yes                        |
| `archive`   | Old or inactive material                               | no, only search explicitly |

## Where to Save What

Use dated slugs for wiki documents by default. Prefer `yy-mm-dd-<slug>.md` unless the user explicitly asks to update a specific existing file with another name.

| User intent                  | Path pattern                                     |
| ---------------------------- | ------------------------------------------------ |
| Save a spec or plan          | `projects/<project>/<yy-mm-dd>-<slug>.md`        |
| Save to the project          | `projects/<project>/<yy-mm-dd>-<slug>.md`        |
| Create a runbook or resource | `resources/<yy-mm-dd>-<slug>.md`                 |
| Add to an area               | `areas/<area>/<yy-mm-dd>-<slug>.md`              |
| Save a project session log   | `projects/<project>/memory/<yy-mm-dd>-<slug>.md` |
| Save a resource/tooling log  | `resources/<topic>/memory/<yy-mm-dd>-<slug>.md`  |
| Save an area session log     | `areas/<area>/memory/<yy-mm-dd>-<slug>.md`       |
| Save inactive history        | `archive/<path>/<yy-mm-dd>-<slug>.md`            |

## Selection Heuristics

- Prefer `projects` when the document belongs to one active project.
- Prefer `resources` when the document should be reusable outside a single project.
- Prefer `areas` for long-lived responsibilities that are not projects.
- Use `archive` only for inactive material or when explicitly requested.
- For session logs, pick the destination based on **what the session was about**, not where pi was invoked from. A session fixing a Mapit bug goes to `projects/mapit/memory/` even if pi was run from `~`.
- `memory/` folders are for session logs and session summaries only. Any other document the agent is asked to write (specs, runbooks, area notes) goes in the normal location for that document type.
- There is no general-purpose session dump folder. Every log belongs somewhere specific.
