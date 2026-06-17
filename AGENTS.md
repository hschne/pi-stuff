# Agent Guidelines

## Conversational Style

- Keep answers short and concise.
- Technical prose only. Be direct.
- No fluff or cheerful filler.
- No emojis in commits, issues, PR comments, or code.
- Answer the user's question first, before making edits or running implementation commands.
- When responding to feedback or an analysis, explicitly say whether you agree or disagree before saying what you changed.
- Don't predict or over-promise. State what works for the task at hand, not sweeping claims.

## Code Quality

The human owns the architecture. system boundaries, module APIs, and separation of concerns. Stay inside those boundaries; surface design decisions instead of inventing them silently.

- Read files in full before wide-ranging changes, before editing files you have not fully inspected, and when asked to investigate or audit. Do not rely on search snippets for broad changes.
- Keep complexity low. Don't add abstractions, helpers, or indirection that aren't needed yet.
- Inline single-line helpers that have only one call site.
- Do not preserve backward compatibility unless the user asks for it.
- Errors compound. Catch mistakes early rather than letting them accumulate across a session.

## Git

Multiple agent sessions may run in the same cwd at once, each modifying different files. Git operations that touch unstaged, staged, or untracked files outside your own changes will stomp on other sessions' work.

Committing:

- Only commit files YOU changed in THIS session.
- Stage explicit paths (`git add <path1> <path2>`); never `git add -A` / `git add .`.
- Run `git status` before committing and verify you are only staging your files.
- Keep commit messages informative and concise. No emojis.
- Never commit unless the user asks.

Never run:

- `git reset --hard`, `git checkout .`, `git clean -fd`, `git stash`, `git add -A`, `git add .`, `git commit --no-verify`.

If rebase conflicts occur:

- Resolve conflicts only in files you modified.
- If a conflict is in a file you did not modify, abort and ask the user.
- Never force push.

## User Override

If the user's instructions conflict with any rule in this document, ask for explicit confirmation before overriding. Only then execute their instructions.
