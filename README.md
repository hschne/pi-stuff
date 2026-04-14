# pi-stuff

This is my standalone repo for Pi agent configuration.

It used to live in homeshick with the rest of my dotfiles. That worked, but it was annoying in practice. Pi config, extensions, prompts, and skills change often enough that I want this to behave like a normal repo on disk, not a pile of symlinks I have to think about.

## What's in here

- agent config
- custom extensions
- prompts
- skills
- themes

## What's not tracked

Local machine state and runtime files stay out of git. That includes things like:

- `auth.json`
- `sessions/`
- MCP caches
- run history
- local `node_modules/` inside extension workspaces

See `.gitignore` for the exact list.

## Repo location

This repo lives at:

- `~/.pi/agent`

GitHub remote:

- `https://github.com/hschne/pi-stuff`
