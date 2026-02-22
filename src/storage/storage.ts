export interface StoredTokenData {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_at?: number; // Unix timestamp ms
  scopes?: string[];
  raw?: Record<string, unknown>;
}

export interface ITokenStorage {
  store(provider: string, account: string, data: StoredTokenData): Promise<void>;
  retrieve(provider: string, account: string): Promise<StoredTokenData | null>;
  delete(provider: string, account: string): Promise<void>;
  list(): Promise<Array<{ provider: string; account: string }>>;
}

import { KeychainStorage, isKeychainAvailable } from "./keychain-storage.js";
import { EncryptedFileStorage } from "./encrypted-file-storage.js";
import { logger } from "../utils/logger.js";

let cachedStorage: ITokenStorage | null = null;

export async function createStorage(): Promise<ITokenStorage> {
  if (cachedStorage) return cachedStorage;

  if (await isKeychainAvailable()) {
    logger.debug("Using OS keychain for token storage.");
    cachedStorage = new KeychainStorage();
  } else {
    logger.warn(
      "OS keychain not available. Falling back to encrypted file storage.",
    );
    cachedStorage = new EncryptedFileStorage();
  }

  return cachedStorage;
}
