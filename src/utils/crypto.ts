import {
  randomBytes,
  scryptSync,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";

// AES-256-GCM encryption

export function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, 32);
}

export function generateSalt(): Buffer {
  return randomBytes(32);
}

export interface EncryptedData {
  iv: string;
  tag: string;
  data: string;
}

export function encrypt(plaintext: string, key: Buffer): EncryptedData {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf-8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    data: encrypted,
  };
}

export function decrypt(encrypted: EncryptedData, key: Buffer): string {
  const iv = Buffer.from(encrypted.iv, "hex");
  const tag = Buffer.from(encrypted.tag, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted.data, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}

// PKCE helpers

export function generateCodeVerifier(): string {
  return randomBytes(32)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9\-._~]/g, "")
    .slice(0, 128);
}

export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function generateState(): string {
  return randomBytes(16).toString("hex");
}
