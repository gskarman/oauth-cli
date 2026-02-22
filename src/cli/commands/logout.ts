import type { Command } from "commander";
import { ProviderRegistry } from "../../providers/registry.js";
import { TokenManager } from "../../auth/token-manager.js";
import { createStorage } from "../../storage/storage.js";
import { logger } from "../../utils/logger.js";

export function registerLogoutCommand(program: Command): void {
  program
    .command("logout <provider>")
    .description("Revoke and delete tokens for a provider")
    .option("-a, --account <account>", "Account name", "default")
    .action(async (providerId: string, opts) => {
      const registry = new ProviderRegistry();
      const providerConfig = registry.getProvider(providerId);
      if (!providerConfig) {
        logger.error(`Provider '${providerId}' not found.`);
        process.exit(1);
      }

      const storage = await createStorage();
      const tokenManager = new TokenManager(storage);
      await tokenManager.revokeToken(providerId, opts.account, providerConfig);
      logger.info(`Logged out from ${providerId} (account: ${opts.account}).`);
    });
}
