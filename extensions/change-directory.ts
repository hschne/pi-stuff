import { existsSync, realpathSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { SessionManager } from "@earendil-works/pi-coding-agent";

const MIGRATION_MESSAGE_TYPE = "change-directory";

function resolveDirectory(input: string, cwd: string): string {
  let candidate = input.trim();

  if (candidate === "~") {
    candidate = homedir();
  } else if (candidate.startsWith("~/")) {
    candidate = path.join(homedir(), candidate.slice(2));
  } else if (candidate.startsWith("~")) {
    throw new Error("Only ~ and ~/… home paths are supported");
  }

  const resolved = path.resolve(cwd, candidate);
  if (!existsSync(resolved)) {
    throw new Error(`Directory does not exist: ${resolved}`);
  }

  const canonical = realpathSync(resolved);
  if (!statSync(canonical).isDirectory()) {
    throw new Error(`Not a directory: ${canonical}`);
  }

  return canonical;
}

function removeCreatedSession(sessionFile: string): void {
  try {
    rmSync(sessionFile);
  } catch {
    // Preserve the original migration error if cleanup fails.
  }
}

export default function changeDirectoryExtension(pi: ExtensionAPI): void {
  pi.registerCommand("cd", {
    description: "Migrate the current session to another working directory",
    handler: async (args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("cd requires interactive mode", "error");
        return;
      }

      const input =
        args.trim() || (await ctx.ui.input("Change directory", ctx.cwd));
      if (!input?.trim()) return;

      let targetCwd: string;
      try {
        targetCwd = resolveDirectory(input, ctx.cwd);
      } catch (error) {
        ctx.ui.notify(
          error instanceof Error ? error.message : String(error),
          "error",
        );
        return;
      }

      let currentCwd: string;
      try {
        currentCwd = realpathSync(ctx.cwd);
      } catch {
        currentCwd = path.resolve(ctx.cwd);
      }

      if (targetCwd === currentCwd) {
        ctx.ui.notify(`Already in ${targetCwd}`, "info");
        return;
      }

      const sourceSessionFile = ctx.sessionManager.getSessionFile();
      if (
        !sourceSessionFile ||
        !existsSync(sourceSessionFile) ||
        statSync(sourceSessionFile).size === 0
      ) {
        ctx.ui.notify("No persisted session to migrate", "info");
        return;
      }

      let targetSessionFile: string;
      try {
        const targetSession = SessionManager.forkFrom(
          sourceSessionFile,
          targetCwd,
        );
        targetSession.appendCustomMessageEntry(
          MIGRATION_MESSAGE_TYPE,
          `Session migrated from ${currentCwd} to ${targetCwd}.`,
          true,
        );
        const createdFile = targetSession.getSessionFile();
        if (!createdFile) throw new Error("Failed to create target session");
        targetSessionFile = createdFile;
      } catch (error) {
        ctx.ui.notify(
          `Failed to migrate session: ${error instanceof Error ? error.message : String(error)}`,
          "error",
        );
        return;
      }

      const previousProcessCwd = process.cwd();
      try {
        process.chdir(targetCwd);
        const result = await ctx.switchSession(targetSessionFile, {
          withSession: async (replacementCtx) => {
            replacementCtx.ui.notify(
              `Changed directory to ${targetCwd}`,
              "info",
            );
          },
        });

        if (result.cancelled) {
          process.chdir(previousProcessCwd);
          removeCreatedSession(targetSessionFile);
          ctx.ui.notify("Directory change cancelled", "info");
        }
      } catch (error) {
        process.chdir(previousProcessCwd);
        removeCreatedSession(targetSessionFile);
        ctx.ui.notify(
          `Failed to change directory: ${error instanceof Error ? error.message : String(error)}`,
          "error",
        );
      }
    },
  });
}
