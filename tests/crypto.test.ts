import { describe, it, expect } from "vitest";
import {
  encrypt,
  decrypt,
  deriveKey,
  generateSalt,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "../src/utils/crypto.js";

describe("AES-256-GCM encrypt/decrypt", () => {
  it("should encrypt and decrypt a string", () => {
    const salt = generateSalt();
    const key = deriveKey("test-passphrase", salt);
    const plaintext = JSON.stringify({ access_token: "abc123", refresh_token: "xyz" });
    const encrypted = encrypt(plaintext, key);

    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.tag).toBeTruthy();
    expect(encrypted.data).toBeTruthy();
    expect(encrypted.data).not.toEqual(plaintext);

    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toEqual(plaintext);
  });

  it("should fail to decrypt with wrong key", () => {
    const salt = generateSalt();
    const key1 = deriveKey("passphrase-1", salt);
    const key2 = deriveKey("passphrase-2", salt);

    const encrypted = encrypt("secret data", key1);
    expect(() => decrypt(encrypted, key2)).toThrow();
  });

  it("should produce different ciphertexts for same plaintext (random IV)", () => {
    const salt = generateSalt();
    const key = deriveKey("test", salt);
    const e1 = encrypt("same", key);
    const e2 = encrypt("same", key);
    expect(e1.iv).not.toEqual(e2.iv);
    expect(e1.data).not.toEqual(e2.data);
  });
});

describe("PKCE", () => {
  it("should generate a code verifier of valid length", () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(verifier).toMatch(/^[a-zA-Z0-9\-._~]+$/);
  });

  it("should generate a code challenge from verifier", () => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    expect(challenge).toBeTruthy();
    expect(challenge).not.toEqual(verifier);
    // base64url encoding: no +, /, or =
    expect(challenge).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it("should produce deterministic challenge for same verifier", () => {
    const verifier = "test-verifier-string";
    const c1 = generateCodeChallenge(verifier);
    const c2 = generateCodeChallenge(verifier);
    expect(c1).toEqual(c2);
  });
});

describe("generateState", () => {
  it("should produce a hex string", () => {
    const state = generateState();
    expect(state).toMatch(/^[a-f0-9]{32}$/);
  });

  it("should produce unique values", () => {
    const states = new Set(Array.from({ length: 10 }, () => generateState()));
    expect(states.size).toBe(10);
  });
});
