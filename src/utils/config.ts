import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ProviderConfig } from "../providers/types.js";

export interface AppConfig {
  providers: Record<string, ProviderConfig>;
  preferences?: {
    storage_backend?: "keychain" | "encrypted-file";
  };
}

const CONFIG_DIR = join(homedir(), ".oauth-cli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function getConfigDir(): string {
  ensureConfigDir();
  return CONFIG_DIR;
}

export function loadConfig(): AppConfig {
  ensureConfigDir();
  if (!existsSync(CONFIG_FILE)) {
    return { providers: {} };
  }
  const raw = readFileSync(CONFIG_FILE, "utf-8");
  return JSON.parse(raw) as AppConfig;
}

export function saveConfig(config: AppConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}
