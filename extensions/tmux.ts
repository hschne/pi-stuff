import { execFileSync, execSync } from "node:child_process";
import { basename } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const MARKER = "π";
const MAX_SESSION_TITLE_LEN = 30;

const is_tmux = (): boolean => {
  return !!process.env.TMUX;
};

const tmux = (cmd: string): string => {
  try {
    return execSync(`tmux ${cmd}`, { encoding: "utf-8", timeout: 2000 }).trim();
  } catch {
    return "";
  }
};

const shorten_model = (id: string): string => {
  let short = id;
  short = short.replace(/-\d{8}$/, "");
  short = short.replace(/^claude-/, "");
  return short;
};

const truncate = (str: string, max: number): string => {
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1)}…`;
};

export default function (pi: ExtensionAPI) {
  if (!is_tmux()) return;

  const pane_id =
    process.env.TMUX_PANE || tmux("display-message -p '#{pane_id}'");
  if (!pane_id) return;

  const project_name = basename(process.cwd());
  let model_name = "";
  let is_working = false;
  let errored = false;
  let last_title = "";
  let last_state = "";

  const tmux_run = (args: string[]): void => {
    try {
      execFileSync("tmux", args, { stdio: "ignore", timeout: 2000 });
    } catch {
      // Ignore tmux errors.
    }
  };

  const get_session_title = (ctx?: {
    sessionManager: { getBranch(): any[] };
  }): string | undefined => {
    const name = pi.getSessionName();
    if (name) return name;

    if (!ctx) return undefined;

    try {
      for (const entry of ctx.sessionManager.getBranch()) {
        if (
          entry.type === "message" &&
          entry.message?.role === "user" &&
          Array.isArray(entry.message.content)
        ) {
          const text_part = entry.message.content.find(
            (c: any) => c.type === "text",
          );
          if (text_part?.text) {
            const first_line = text_part.text.split("\n")[0].trim();
            if (first_line) return first_line;
          }
        }
      }
    } catch {
      // Ignore errors reading session.
    }

    return undefined;
  };

  // One tmux invocation updates the pane border title (@pi_title) and the
  // window-tab status/label, then refreshes. Args are passed literally (no
  // shell), so the title needs no escaping. Skipped when nothing changed.
  const update_title = (ctx?: { sessionManager: { getBranch(): any[] } }) => {
    const status_icon = is_working ? `${MARKER}*` : MARKER;
    const model_part = model_name ? ` · ${model_name}` : "";
    const session_title = get_session_title(ctx);
    const session_part = session_title
      ? ` · ${truncate(session_title, MAX_SESSION_TITLE_LEN)}`
      : "";
    const title = `${status_icon} ${project_name}${model_part}${session_part}`;
    const state = is_working ? "working" : errored ? "crashed" : "waiting";

    if (title === last_title && state === last_state) return;
    last_title = title;
    last_state = state;

    tmux_run([
      "set-option",
      "-p",
      "-t",
      pane_id,
      "@pi_title",
      title,
      ";",
      "set-option",
      "-p",
      "-t",
      pane_id,
      "@pane_status",
      state,
      ";",
      "set-option",
      "-p",
      "-t",
      pane_id,
      "@pane_label",
      MARKER,
      ";",
      "refresh-client",
      "-S",
    ]);
  };

  const clear_title = () => {
    last_title = "";
    last_state = "";
    tmux_run([
      "set-option",
      "-pu",
      "-t",
      pane_id,
      "@pi_title",
      ";",
      "set-option",
      "-pu",
      "-t",
      pane_id,
      "@pane_status",
      ";",
      "set-option",
      "-pu",
      "-t",
      pane_id,
      "@pane_label",
      ";",
      "refresh-client",
      "-S",
    ]);
  };

  pi.on("session_start", async (_event, ctx) => {
    if (ctx.model) {
      model_name = shorten_model(ctx.model.id);
    }
    update_title(ctx);
  });

  pi.on("model_select", async (event, ctx) => {
    model_name = shorten_model(event.model.id);
    update_title(ctx);
  });

  pi.on("session_switch", async (_event, ctx) => {
    update_title(ctx);
  });

  pi.on("session_fork", async (_event, ctx) => {
    update_title(ctx);
  });

  pi.on("agent_start", async (_event, ctx) => {
    is_working = true;
    errored = false;
    update_title(ctx);
  });

  // Track the latest provider HTTP status so a failed turn (e.g. a 429
  // rate limit) ends as crashed (red) rather than waiting (blue).
  pi.on("after_provider_response", async (event) => {
    errored = event.status >= 400;
  });

  pi.on("agent_end", async (_event, ctx) => {
    is_working = false;
    update_title(ctx);
  });

  pi.on("session_shutdown", async () => {
    clear_title();
  });
}
