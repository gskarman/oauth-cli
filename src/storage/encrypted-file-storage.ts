import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { getConfigDir } from "../utils/config.js";
import {
  deriveKey,
  generateSalt,
  encrypt,
  decrypt,
  type EncryptedData,
} from "../utils/crypto.js";
import { logger } from "../utils/logger.js";
import type { ITokenStorage, StoredTokenData } from "./storage.js";

function getTokensDir(): string {
  const dir = join(getConfigDir(), "tokens");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getSaltPath(): string {
  return join(getConfigDir(), ".salt");
}

async function promptPassphrase(prompt: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export class EncryptedFileStorage implements ITokenStorage {
  private key: Buffer | null = null;

  private async ensureKey(): Promise<Buffer> {
    if (this.key) return this.key;

    const saltPath = getSaltPath();
    let salt: Buffer;

    if (existsSync(saltPath)) {
      salt = Buffer.from(readFileSync(saltPath, "utf-8"), "hex");
    } else {
      salt = generateSalt();
      writeFileSync(saltPath, salt.toString("hex"), "utf-8");
      logger.info("Created new encryption salt.");
    }

    const passphrase = await promptPassphrase(
      "Enter passphrase for token encryption: ",
    );
    this.key = deriveKey(passphrase, salt);
    return this.key;
  }

  private getFilePath(provider: string, account: string): string {
    const dir = join(getTokensDir(), provider);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return join(dir, `${account}.enc`);
  }

  async store(
    provider: string,
    account: string,
    data: StoredTokenData,
  ): Promise<void> {
    const key = await this.ensureKey();
    const plaintext = JSON.stringify(data);
    const encrypted = encrypt(plaintext, key);
    const filePath = this.getFilePath(provider, account);
    writeFileSync(filePath, JSON.stringify(encrypted, null, 2), "utf-8");
  }

  async retrieve(
    provider: string,
    account: string,
  ): Promise<StoredTokenData | null> {
    const filePath = this.getFilePath(provider, account);
    if (!existsSync(filePath)) return null;

    const key = await this.ensureKey();
    try {
      const raw = readFileSync(filePath, "utf-8");
      const encrypted = JSON.parse(raw) as EncryptedData;
      const plaintext = decrypt(encrypted, key);
      return JSON.parse(plaintext) as StoredTokenData;
    } catch {
      logger.error(
        `Failed to decrypt token for ${provider}/${account}. Wrong passphrase?`,
      );
      return null;
    }
  }

  async delete(provider: string, account: string): Promise<void> {
    const filePath = this.getFilePath(provider, account);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async list(): Promise<Array<{ provider: string; account: string }>> {
    const tokensDir = getTokensDir();
    const results: Array<{ provider: string; account: string }> = [];

    if (!existsSync(tokensDir)) return results;

    const providers = readdirSync(tokensDir, { withFileTypes: true });
    for (const providerDir of providers) {
      if (!providerDir.isDirectory()) continue;
      const providerPath = join(tokensDir, providerDir.name);
      const files = readdirSync(providerPath);
      for (const file of files) {
        if (file.endsWith(".enc")) {
          results.push({
            provider: providerDir.name,
            account: file.replace(/\.enc$/, ""),
          });
        }
      }
    }

    return results;
  }
}
