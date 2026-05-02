import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { Settings } from "./types.ts";

const SETTINGS_KEY = "pi-minimal-subagent";

function readJsonSafe(filePath: string): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

function isPackageSource(value: string): boolean {
  return value.startsWith("npm:") || value.startsWith("git:");
}

export function resolveConfiguredPath(value: string, baseDir: string): string {
  if (!value) return value;
  if (isPackageSource(value)) return value;
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  if (path.isAbsolute(value)) return value;
  return path.resolve(baseDir, value);
}

function readSettings(filePath: string, baseDir: string): Partial<Settings> {
  const raw = readJsonSafe(filePath)[SETTINGS_KEY];
  if (!raw || typeof raw !== "object") return {};

  const config = raw as Record<string, unknown>;
  const settings: Partial<Settings> = {};

  if (typeof config.model === "string" && config.model.trim()) {
    settings.model = config.model;
  } else if (config.model === null) {
    settings.model = null;
  }

  if (Array.isArray(config.extensions)) {
    settings.extensions = config.extensions
      .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      .map((entry) => resolveConfiguredPath(entry.trim(), baseDir));
  }

  return settings;
}

export function resolveSettings(cwd: string): Settings {
  const globalDir = path.join(os.homedir(), ".pi", "agent");
  const projectDir = path.join(cwd, ".pi");

  return {
    model: null,
    extensions: [],
    ...readSettings(path.join(globalDir, "settings.json"), globalDir),
    ...readSettings(path.join(projectDir, "settings.json"), projectDir),
  };
}
