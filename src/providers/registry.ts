import { ProviderConfigSchema, type ProviderConfig } from "./types.js";
import { loadConfig, saveConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

export class ProviderRegistry {
  getProvider(id: string): ProviderConfig | null {
    const config = loadConfig();
    return config.providers[id] ?? null;
  }

  listProviders(): Array<{ id: string; config: ProviderConfig }> {
    const config = loadConfig();
    return Object.entries(config.providers).map(([id, providerConfig]) => ({
      id,
      config: providerConfig,
    }));
  }

  addProvider(id: string, rawConfig: unknown): ProviderConfig {
    const config = loadConfig();
    if (config.providers[id]) {
      throw new Error(`Provider '${id}' already exists. Use update to modify it.`);
    }

    const parsed = ProviderConfigSchema.parse(rawConfig);
    config.providers[id] = parsed;
    saveConfig(config);
    logger.info(`Provider '${id}' added successfully.`);
    return parsed;
  }

  updateProvider(
    id: string,
    partial: Partial<ProviderConfig>,
  ): ProviderConfig {
    const config = loadConfig();
    if (!config.providers[id]) {
      throw new Error(`Provider '${id}' not found.`);
    }

    const merged = { ...config.providers[id], ...partial };
    const parsed = ProviderConfigSchema.parse(merged);
    config.providers[id] = parsed;
    saveConfig(config);
    logger.info(`Provider '${id}' updated successfully.`);
    return parsed;
  }

  removeProvider(id: string): void {
    const config = loadConfig();
    if (!config.providers[id]) {
      throw new Error(`Provider '${id}' not found.`);
    }
    delete config.providers[id];
    saveConfig(config);
    logger.info(`Provider '${id}' removed.`);
  }

  resolveScopes(
    providerId: string,
    scopes?: string[],
    preset?: string,
  ): string[] {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider '${providerId}' not found.`);
    }

    if (preset && provider.scope_presets?.[preset]) {
      return provider.scope_presets[preset].scopes;
    }

    if (scopes && scopes.length > 0) {
      return scopes;
    }

    return provider.scopes;
  }
}
