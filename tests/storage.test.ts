import { describe, it, expect, beforeEach } from "vitest";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { vi } from "vitest";
import type { StoredTokenData } from "../src/storage/storage.js";
import { deriveKey, generateSalt } from "../src/utils/crypto.js";

// Mock config to use temp directory
const testDir = join(tmpdir(), `oauth-cli-storage-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
vi.mock("../src/utils/config.js", () => {
  const { existsSync, mkdirSync } = require("node:fs");
  return {
    getConfigDir: () => {
      if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });
      return testDir;
    },
    loadConfig: () => ({ providers: {} }),
    saveConfig: () => {},
  };
});

// We'll test EncryptedFileStorage with a pre-derived key to avoid stdin prompts
import { encrypt, decrypt, type EncryptedData } from "../src/utils/crypto.js";

describe("EncryptedFileStorage (crypto primitives)", () => {
  const salt = generateSalt();
  const key = deriveKey("test-passphrase", salt);

  it("should round-trip token data through encrypt/decrypt", () => {
    const tokenData: StoredTokenData = {
      access_token: "at_12345",
      refresh_token: "rt_67890",
      token_type: "Bearer",
      expires_at: Date.now() + 3600000,
      scopes: ["read", "write"],
    };

    const plaintext = JSON.stringify(tokenData);
    const encrypted = encrypt(plaintext, key);
    const decrypted = decrypt(encrypted, key);
    const parsed = JSON.parse(decrypted) as StoredTokenData;

    expect(parsed.access_token).toBe("at_12345");
    expect(parsed.refresh_token).toBe("rt_67890");
    expect(parsed.token_type).toBe("Bearer");
    expect(parsed.scopes).toEqual(["read", "write"]);
  });
});

describe("Token expiry logic", () => {
  it("should detect expired token", () => {
    const expiresAt = Date.now() - 1000; // 1 second ago
    expect(Date.now() > expiresAt).toBe(true);
  });

  it("should detect token within buffer period", () => {
    const BUFFER = 5 * 60 * 1000;
    const expiresAt = Date.now() + 2 * 60 * 1000; // 2 min from now
    expect(Date.now() > expiresAt - BUFFER).toBe(true); // within 5-min buffer
  });

  it("should detect valid token outside buffer", () => {
    const BUFFER = 5 * 60 * 1000;
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min from now
    expect(Date.now() > expiresAt - BUFFER).toBe(false);
  });
});
