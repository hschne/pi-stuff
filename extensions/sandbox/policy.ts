import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const CONFIG_KEYS = new Set([
  "enabled",
  "write",
  "denyRead",
  "allowEnv",
  "scrubEnv",
  "alias",
]);

export interface SandboxJson {
  enabled?: boolean;
  write?: string[];
  denyRead?: string[];
  allowEnv?: string[];
  scrubEnv?: string[];
  alias?: Record<string, string[]>;
}

export interface ConfigIssue {
  path: string;
  message: string;
  fatal: boolean;
}

export interface ConfigLoadResult {
  config: SandboxJson;
  issues: ConfigIssue[];
}

export interface AccessDecision {
  path: string;
  allowed: boolean;
}

type AccessMode = "read" | "write";
type ConfigArrayKey = "write" | "denyRead" | "allowEnv" | "scrubEnv";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringArray(
  config: Record<string, unknown>,
  key: ConfigArrayKey,
): string[] | undefined {
  const value = config[key];
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    !value.every((entry) => typeof entry === "string")
  ) {
    throw new Error(`"${key}" must be an array of strings`);
  }
  return value;
}

function readAliases(value: unknown): Record<string, string[]> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error('"alias" must be an object');

  const aliases: Record<string, string[]> = {};
  for (const [name, entries] of Object.entries(value)) {
    if (
      !name ||
      !Array.isArray(entries) ||
      entries.length === 0 ||
      !entries.every((entry) => typeof entry === "string")
    ) {
      throw new Error(`alias "${name}" must be a non-empty array of strings`);
    }
    aliases[name] = entries;
  }
  return aliases;
}

function readConfigFile(filePath: string, isGlobal: boolean): SandboxJson {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
  if (!isRecord(value)) throw new Error("config must be a JSON object");

  const unknownKey = Object.keys(value).find((key) => !CONFIG_KEYS.has(key));
  if (unknownKey) throw new Error(`unknown key "${unknownKey}"`);
  if (value.enabled !== undefined && typeof value.enabled !== "boolean") {
    throw new Error('"enabled" must be a boolean');
  }
  if (!isGlobal && value.alias !== undefined) {
    throw new Error('"alias" is only allowed in the global config');
  }

  return {
    enabled: value.enabled as boolean | undefined,
    write: readStringArray(value, "write"),
    denyRead: readStringArray(value, "denyRead"),
    allowEnv: readStringArray(value, "allowEnv"),
    scrubEnv: readStringArray(value, "scrubEnv"),
    alias: readAliases(value.alias),
  };
}

/** Load valid config files in order. Invalid project config cannot erase global policy. */
export function loadSandboxConfig(
  cwd: string,
  extraCwds: string[] = [],
): ConfigLoadResult {
  const globalPath = path.join(homedir(), ".pi", "agent", "sandbox.json");
  const projectCwds = [...new Set([cwd, ...extraCwds])];
  const files = [
    { path: globalPath, isGlobal: true },
    ...projectCwds.map((projectCwd) => ({
      path: path.join(projectCwd, ".pi", "sandbox.json"),
      isGlobal: false,
    })),
  ];
  const config: SandboxJson = {};
  const issues: ConfigIssue[] = [];
  const scrubEnv = new Set<string>();

  for (const file of files) {
    if (!existsSync(file.path)) continue;

    let next: SandboxJson;
    try {
      next = readConfigFile(file.path, file.isGlobal);
    } catch (error) {
      issues.push({
        path: file.path,
        message: error instanceof Error ? error.message : String(error),
        fatal: file.isGlobal,
      });
      continue;
    }

    if (next.enabled !== undefined) config.enabled = next.enabled;
    config.write = [...(config.write ?? []), ...(next.write ?? [])];
    config.denyRead = [...(config.denyRead ?? []), ...(next.denyRead ?? [])];
    for (const name of next.scrubEnv ?? []) scrubEnv.add(name);
    for (const name of next.allowEnv ?? []) scrubEnv.delete(name);
    if (file.isGlobal && next.alias !== undefined) config.alias = next.alias;
  }

  config.scrubEnv = [...scrubEnv];
  return { config, issues };
}

function expand(entry: string, cwd: string): string {
  if (entry === "~") return homedir();
  const expanded = entry.startsWith("~/")
    ? path.join(homedir(), entry.slice(2))
    : entry;
  return path.isAbsolute(expanded)
    ? path.normalize(expanded)
    : path.resolve(cwd, expanded);
}

/** Resolve symlinks for an existing prefix while preserving a missing tail. */
function physicalPath(absolutePath: string): string {
  const missing: string[] = [];
  let current = path.normalize(absolutePath);
  while (!existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return path.normalize(absolutePath);
    missing.unshift(path.basename(current));
    current = parent;
  }
  return path.join(realpathSync.native(current), ...missing);
}

function isInside(base: string, target: string): boolean {
  if (target === base) return true;
  const relative = path.relative(base, target);
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
}

function outermostDirs(dirs: readonly string[]): string[] {
  const uniqueDirs = [...new Set(dirs)];
  return uniqueDirs.filter(
    (dir) => !uniqueDirs.some((other) => other !== dir && isInside(other, dir)),
  );
}

function addGrantMountTargets(
  args: string[],
  maskedDirs: readonly string[],
  grantDirs: readonly string[],
): void {
  const targets = new Set<string>();
  for (const grant of grantDirs) {
    const mask = maskedDirs.find((dir) => isInside(dir, grant));
    if (!mask || mask === grant) continue;

    const parts = path.relative(mask, grant).split(path.sep);
    for (let index = 1; index <= parts.length; index++) {
      targets.add(path.join(mask, ...parts.slice(0, index)));
    }
  }
  for (const target of targets) args.push("--dir", target);
}

export class SandboxPolicy {
  readonly cwd: string;
  readonly writeDirs: readonly string[];
  readonly grantDirs: readonly string[];
  readonly scrubEnvCount: number;

  readonly #denyRead: readonly string[];
  readonly #scrubEnv: ReadonlySet<string>;

  constructor(config: SandboxJson, cwd: string, sessionGrants: string[]) {
    this.cwd = physicalPath(cwd);
    const launchCwd = physicalPath(process.cwd());
    const writeDirs = (config.write ?? []).map((entry) =>
      physicalPath(expand(entry, cwd)),
    );
    this.#denyRead = (config.denyRead ?? []).map((entry) =>
      physicalPath(expand(entry, cwd)),
    );
    this.#scrubEnv = new Set(config.scrubEnv ?? []);
    this.scrubEnvCount = this.#scrubEnv.size;

    const grantDirs = sessionGrants.map((grant) => {
      if (!path.isAbsolute(grant)) {
        throw new Error(`Persisted grant is not absolute: ${grant}`);
      }
      const physicalGrant = physicalPath(grant);
      if (
        !existsSync(physicalGrant) ||
        !statSync(physicalGrant).isDirectory()
      ) {
        throw new Error(
          `Persisted grant is not an existing directory: ${grant}`,
        );
      }
      return physicalGrant;
    });
    this.grantDirs = [...new Set(grantDirs)];
    this.writeDirs = [
      ...new Set([
        this.cwd,
        launchCwd,
        "/tmp",
        ...writeDirs,
        ...this.grantDirs,
      ]),
    ];
  }

  checkAccess(target: string | undefined, mode: AccessMode): AccessDecision {
    const input = (target ?? "").trim();
    const cleaned = input.startsWith("@") ? input.slice(1) : input;
    const logicalPath = cleaned
      ? path.isAbsolute(cleaned)
        ? path.normalize(cleaned)
        : path.resolve(this.cwd, cleaned)
      : this.cwd;
    const resolvedPath = physicalPath(logicalPath);
    const isGranted = this.grantDirs.some((dir) => isInside(dir, resolvedPath));
    const isDenied =
      !isGranted && this.#denyRead.some((dir) => isInside(dir, resolvedPath));
    const allowed =
      !isDenied &&
      (mode === "read" ||
        this.writeDirs.some((dir) => isInside(dir, resolvedPath)));
    return { path: resolvedPath, allowed };
  }

  maskedReadDirs(): string[] {
    return this.#denyRead.filter(
      (dir) =>
        existsSync(dir) &&
        !this.grantDirs.some((grant) => isInside(grant, dir)),
    );
  }

  bwrapArgs(workingDirectory: string): string[] {
    const workingDirectoryAccess = this.checkAccess(workingDirectory, "read");
    if (!workingDirectoryAccess.allowed) {
      throw new Error(
        `Sandbox working directory is not readable: ${workingDirectoryAccess.path}`,
      );
    }

    const args = [
      "--die-with-parent",
      "--new-session",
      "--unshare-pid",
      "--ro-bind",
      "/",
      "/",
      "--proc",
      "/proc",
      "--dev",
      "/dev",
    ];
    for (const dir of this.writeDirs) {
      if (existsSync(dir)) args.push("--bind", dir, dir);
    }

    const masks = outermostDirs(this.maskedReadDirs());
    const maskedDirs: string[] = [];
    for (const dir of masks) {
      if (statSync(dir).isDirectory()) {
        args.push("--tmpfs", dir);
        maskedDirs.push(dir);
      } else {
        args.push("--ro-bind", "/dev/null", dir);
      }
    }
    addGrantMountTargets(args, maskedDirs, this.grantDirs);
    for (const dir of this.grantDirs) args.push("--bind", dir, dir);
    args.push("--chdir", workingDirectoryAccess.path);
    return args;
  }

  scrubbedEnv(base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    const scrubbed: NodeJS.ProcessEnv = {};
    for (const [name, value] of Object.entries(base)) {
      if (!this.#scrubEnv.has(name)) scrubbed[name] = value;
    }
    return scrubbed;
  }

  static resolveGrantDirectories(
    input: string,
    config: SandboxJson,
    cwd: string,
  ): string[] {
    const entries = config.alias?.[input] ?? [input];
    const directories = [
      ...new Set(entries.map((entry) => physicalPath(expand(entry, cwd)))),
    ];
    for (const directory of directories) {
      if (!existsSync(directory) || !statSync(directory).isDirectory()) {
        throw new Error(`Grant must be an existing directory: ${directory}`);
      }
    }
    return directories;
  }
}
