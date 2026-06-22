import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PATCHED = Symbol.for("pi.suppressSkillConflicts.patched");

/**
 * Suppress intentional skill-collision startup warnings.
 *
 * Pi does not currently expose a public setting for this, so this extension
 * patches the interactive startup renderer and filters only skill collision
 * diagnostics while leaving other skill errors/warnings intact.
 */
export default async function (_pi: ExtensionAPI) {
  const entrypoint = process.argv[1];
  if (!entrypoint) return;

  const resolvedEntrypoint = realpathSync(entrypoint);
  const modesModule = await import(
    pathToFileURL(join(dirname(resolvedEntrypoint), "modes", "index.js")).href
  );
  const proto = modesModule.InteractiveMode?.prototype;
  if (!proto || proto[PATCHED]) return;

  const originalShowLoadedResources = proto.showLoadedResources;
  if (typeof originalShowLoadedResources !== "function") return;

  Object.defineProperty(proto, PATCHED, { value: true });

  proto.showLoadedResources = function patchedShowLoadedResources(
    options: unknown,
  ) {
    const loader = this?.session?.resourceLoader;
    if (!loader || typeof loader.getSkills !== "function") {
      return originalShowLoadedResources.call(this, options);
    }

    const originalGetSkills = loader.getSkills;

    loader.getSkills = function patchedGetSkills(...args: unknown[]) {
      const result = originalGetSkills.apply(this, args);
      return {
        ...result,
        diagnostics: (result.diagnostics ?? []).filter(
          (diagnostic: { type?: string }) => diagnostic.type !== "collision",
        ),
      };
    };

    try {
      return originalShowLoadedResources.call(this, options);
    } finally {
      loader.getSkills = originalGetSkills;
    }
  };
}
