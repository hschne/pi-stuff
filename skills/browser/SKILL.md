---
name: browser
description: Drive a real browser to automate, test, scrape, screenshot, or debug a web page, and to co-work in a browser a human has open. Use for any task that opens or controls a browser, inspects its network/console/performance, or attaches to a shared live browser.
---

# browser

Two MCP backends drive the same system Chromium (`/usr/bin/chromium`). Pick by task:

| Task                                                  | Backend                    |
| ----------------------------------------------------- | -------------------------- |
| Navigate, click, fill, scrape, screenshot, test flows | `playwright` MCP           |
| Debug: network, console, DOM, performance traces      | `chrome-devtools` MCP      |
| Co-work in a browser a human has open                 | `references/co-working.md` |

## playwright MCP

Default backend. Runs headless against the system Chromium. Use the
`browser_*` tools (`browser_navigate`, `browser_snapshot`, `browser_click`,
`browser_type`, `browser_fill_form`, `browser_take_screenshot`, etc.).

Prefer `browser_snapshot` (accessibility tree) over screenshots for driving
actions — it gives stable element refs to target.

## chrome-devtools MCP

Use the `chrome-devtools` MCP tools for debugging and performance (network,
console, traces, Core Web Vitals) or if the user explicitly requests it.

## References

| Topic      | When to Read                                  | Reference                  |
| ---------- | --------------------------------------------- | -------------------------- |
| co-working | Attaching to or opening a shared live browser | `references/co-working.md` |

</content>
</invoke>
