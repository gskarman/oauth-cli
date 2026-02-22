import { Entry } from "@napi-rs/keyring";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { getConfigDir } from "../utils/config.js";
import type { ITokenStorage, StoredTokenData } from "./storage.js";

const SERVICE_PREFIX = "oauth-cli";

function getIndexPath(): string {
  return join(getConfigDir(), "token-index.json");
}

interface TokenIndex {
  entries: Array<{ provider: string; account: string }>;
}

function loadIndex(): TokenIndex {
  const path = getIndexPath();
  if (!existsSync(path)) {
    return { entries: [] };
  }
  return JSON.parse(readFileSync(path, "utf-8")) as TokenIndex;
}

function saveIndex(index: TokenIndex): void {
  writeFileSync(getIndexPath(), JSON.stringify(index, null, 2), "utf-8");
}

function entryKey(provider: string, account: string): string {
  return `${SERVICE_PREFIX}:${provider}:${account}`;
}

export class KeychainStorage implements ITokenStorage {
  async store(
    provider: string,
    account: string,
    data: StoredTokenData,
  ): Promise<void> {
    const key = entryKey(provider, account);
    const entry = new Entry(SERVICE_PREFIX, key);
    entry.setPassword(JSON.stringify(data));

    // Update index
    const index = loadIndex();
    const exists = index.entries.some(
      (e) => e.provider === provider && e.account === account,
    );
    if (!exists) {
      index.entries.push({ provider, account });
      saveIndex(index);
    }
  }

  async retrieve(
    provider: string,
    account: string,
  ): Promise<StoredTokenData | null> {
    const key = entryKey(provider, account);
    const entry = new Entry(SERVICE_PREFIX, key);
    try {
      const password = entry.getPassword();
      if (password === null) return null;
      return JSON.parse(password) as StoredTokenData;
    } catch {
      return null;
    }
  }

  async delete(provider: string, account: string): Promise<void> {
    const key = entryKey(provider, account);
    const entry = new Entry(SERVICE_PREFIX, key);
    try {
      entry.deletePassword();
    } catch {
      // Already deleted or not found
    }

    // Update index
    const index = loadIndex();
    index.entries = index.entries.filter(
      (e) => !(e.provider === provider && e.account === account),
    );
    saveIndex(index);
  }

  async list(): Promise<Array<{ provider: string; account: string }>> {
    return loadIndex().entries;
  }
}

/** Test if the OS keychain is available by doing a write/read/delete cycle. */
export async function isKeychainAvailable(): Promise<boolean> {
  const testKey = `${SERVICE_PREFIX}:__probe__`;
  try {
    const entry = new Entry(SERVICE_PREFIX, testKey);
    entry.setPassword("test");
    const val = entry.getPassword();
    entry.deletePassword();
    return val === "test";
  } catch {
    return false;
  }
}
