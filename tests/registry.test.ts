import { describe, it, expect, beforeEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ProviderRegistry } from "../src/providers/registry.js";
import { vi } from "vitest";

const testDir = join(tmpdir(), `oauth-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const configFile = join(testDir, "config.json");

vi.mock("../src/utils/config.js", async () => {
  const { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } =
    await import("node:fs");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");

  const dir = join(tmpdir(), `oauth-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const file = join(dir, "config.json");

  // Expose a reset function via a global
  (globalThis as any).__oauthTestConfigFile = file;
  (globalThis as any).__oauthTestConfigDir = dir;

  return {
    getConfigDir: () => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      return dir;
    },
    loadConfig: () => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      if (!existsSync(file)) return { providers: {} };
      return JSON.parse(readFileSync(file, "utf-8"));
    },
    saveConfig: (cfg: unknown) => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(file, JSON.stringify(cfg, null, 2), "utf-8");
    },
  };
});

const validProvider = {
  name: "Test Provider",
  authorize_url: "https://auth.example.com/authorize",
  token_url: "https://auth.example.com/token",
  client_id: "test-client-id",
  scopes: ["read", "write"],
  pkce: true,
};

describe("ProviderRegistry", () => {
  let registry: ProviderRegistry;

  beforeEach(async () => {
    // Reset config file between tests
    const { existsSync, unlinkSync } = await import("node:fs");
    const file = (globalThis as any).__oauthTestConfigFile;
    if (file && existsSync(file)) {
      unlinkSync(file);
    }
    registry = new ProviderRegistry();
  });

  it("should add and retrieve a provider", () => {
    registry.addProvider("test", validProvider);
    const provider = registry.getProvider("test");
    expect(provider).not.toBeNull();
    expect(provider!.name).toBe("Test Provider");
    expect(provider!.client_id).toBe("test-client-id");
  });

  it("should list providers", () => {
    registry.addProvider("test1", { ...validProvider, name: "Test 1" });
    registry.addProvider("test2", { ...validProvider, name: "Test 2" });
    const list = registry.listProviders();
    expect(list.length).toBe(2);
  });

  it("should reject duplicate provider IDs", () => {
    registry.addProvider("dupe", validProvider);
    expect(() => registry.addProvider("dupe", validProvider)).toThrow(
      "already exists",
    );
  });

  it("should validate required fields", () => {
    expect(() =>
      registry.addProvider("bad", {
        name: "Bad",
      }),
    ).toThrow();
  });

  it("should update a provider", () => {
    registry.addProvider("upd", validProvider);
    registry.updateProvider("upd", { name: "Updated Name" });
    const provider = registry.getProvider("upd");
    expect(provider!.name).toBe("Updated Name");
  });

  it("should remove a provider", () => {
    registry.addProvider("rem", validProvider);
    registry.removeProvider("rem");
    expect(registry.getProvider("rem")).toBeNull();
  });

  it("should throw when removing non-existent provider", () => {
    expect(() => registry.removeProvider("nope")).toThrow("not found");
  });

  it("should resolve scopes from preset", () => {
    registry.addProvider("scoped", {
      ...validProvider,
      scope_presets: {
        readonly: { description: "Read only", scopes: ["read"] },
        full: { description: "Full access", scopes: ["read", "write", "admin"] },
      },
    });

    expect(registry.resolveScopes("scoped", undefined, "readonly")).toEqual(["read"]);
    expect(registry.resolveScopes("scoped", undefined, "full")).toEqual([
      "read", "write", "admin",
    ]);
  });

  it("should use explicit scopes over presets", () => {
    registry.addProvider("s2", validProvider);
    expect(registry.resolveScopes("s2", ["custom"])).toEqual(["custom"]);
  });

  it("should fall back to default scopes", () => {
    registry.addProvider("s3", validProvider);
    expect(registry.resolveScopes("s3")).toEqual(["read", "write"]);
  });
});
