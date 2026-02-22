import type { Command } from "commander";
import { ProviderRegistry } from "../../providers/registry.js";
import { TokenManager } from "../../auth/token-manager.js";
import { createStorage } from "../../storage/storage.js";
import { logger } from "../../utils/logger.js";

export function registerTokenCommand(program: Command): void {
  program
    .command("token <provider>")
    .description("Print access token to stdout (for human/script use only)")
    .option("-a, --account <account>", "Account name", "default")
    .option("-r, --raw", "Print only the raw token, no extra output")
    .action(async (providerId: string, opts) => {
      const registry = new ProviderRegistry();
      const providerConfig = registry.getProvider(providerId);
      if (!providerConfig) {
        logger.error(`Provider '${providerId}' not found.`);
        process.exit(1);
      }

      const storage = await createStorage();
      const tokenManager = new TokenManager(storage);
      const token = await tokenManager.getValidToken(
        providerId,
        opts.account,
        providerConfig,
      );

      if (!token) {
        logger.error(
          `No valid token for ${providerId}/${opts.account}. Run 'oauth-cli login ${providerId}' first.`,
        );
        process.exit(1);
      }

      if (opts.raw) {
        process.stdout.write(token.access_token);
      } else {
        // Output to stdout (not stderr) so it can be piped
        console.log(token.access_token);
      }
    });
}
