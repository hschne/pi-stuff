# Co-working in a shared browser

Trigger when the user mentions a shared browser, co-working in a browser,
joining or attaching to a browser they have open, or watching you drive it live.

Attaching connects over CDP to an already-running browser; it does not launch
one, so any headless launch config is ignored — you join the human's real live
session.

## Open a browser for co-working

A normal Chromium exposes no CDP port. Start it debug-enabled and headed so both
you and the human can see it:

```bash
chromium --remote-debugging-port=9222 &
```

## Attach with chrome-devtools MCP

The `chrome-devtools` MCP can connect to a running browser over CDP. Point it at
the debugging port (`--browser-url http://127.0.0.1:9222`) instead of launching
its own headless instance, then drive it with the normal tools.

## Rules

- Attach to the human's running browser over its CDP port; do not launch a fresh
  headless one.
- Do not close a browser the human is using — stop sending commands and leave it
open.
</content>
