# Co-working in a shared browser

Trigger when the user mentions a shared browser, co-working in a browser,
joining or attaching to a browser they have open, or watching you drive it live.

Attach connects over CDP to an already-running browser; it does not launch one,
so the config's launch profile is ignored — you join the human's real live
session.

## Find an existing shared browser

```bash
agent-browser --auto-connect snapshot
```

`--auto-connect` reads Chrome's `DevToolsActivePort`, then probes ports 9222 and 9229. On success you are attached.

With a known port:

```bash
agent-browser connect 9222
agent-browser snapshot
```

## Open one for co-working

A normal Chromium exposes no CDP port. Start it debug-enabled, headed, on the
Agent profile, then attach:

```bash
chromium --remote-debugging-port=9222 &
agent-browser --cdp 9222 open https://example.com
```

## Rules

- Attach with `--cdp <port>` or `--auto-connect`. 
- Do not `agent-browser close` a browser the human is using — stop sending
  commands and leave it open.
