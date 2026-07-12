/**
 * Clipboard Utility
 *
 * Cross-platform clipboard copy using system tools.
 */

import { execFileSync } from "node:child_process";

/** Copy text to system clipboard. Returns true on success. */
export function copyToClipboard(text: string): boolean {
  try {
    if (process.platform === "darwin") {
      execFileSync("pbcopy", { input: text, timeout: 3000 });
    } else if (process.platform === "win32") {
      execFileSync("clip", { input: text, timeout: 3000 });
    } else {
      execFileSync("wl-copy", {
        input: text,
        stdio: ["pipe", "ignore", "ignore"],
        timeout: 3000,
      });
    }
    return true;
  } catch {
    return false;
  }
}
