---
name: browser
description: Drive a real browser to automate, test, scrape, screenshot, or debug a web page, and to co-work in a browser a human has open. Use for any task that opens or controls a browser, inspects its network/console/performance, or attaches to a shared live browser.
---

# browser

Two backends drive the same system Chromium (`/usr/bin/chromium`). Pick by task:

| Task                                                  | Backend                                             |
| ----------------------------------------------------- | --------------------------------------------------- |
| Navigate, click, fill, scrape, screenshot, test flows | `agent-browser` CLI                                 |
| Debug: network, console, DOM, performance traces      | `chrome-devtools` MCP                               |
| Co-work in a browser a human has open                 | `agent-browser` attach → `references/co-working.md` |

## agent-browser CLI

Default backend. Installed via mise and pinned to the system Chromium, so do not
run `agent-browser install`.

Get the command set and flags from the CLI rather than guessing — it serves docs
matching the installed version:

```bash
agent-browser skills get core        # workflows + command reference
agent-browser skills get dogfood     # exploratory testing / QA
```

## chrome-devtools MCP

Use the `chrome-devtools` MCP tools for debugging and performance (network,
console, traces, Core Web Vitals) or if the user explicitly requests it. 

## References

| Topic      | When to Read                                  | Reference                  |
| ---------- | --------------------------------------------- | -------------------------- |
| co-working | Attaching to or opening a shared live browser | `references/co-working.md` |
