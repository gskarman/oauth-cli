import type { Command } from "commander";
import { ProviderRegistry } from "../../providers/registry.js";
import { TokenManager } from "../../auth/token-manager.js";
import { executeOAuthFlow } from "../../auth/oauth-flow.js";
import { createStorage } from "../../storage/storage.js";
import { logger } from "../../utils/logger.js";

export function registerLoginCommand(program: Command): void {
  program
    .command("login <provider>")
    .description("Authenticate with an OAuth2 provider via browser")
    .option("-s, --scopes <scopes>", "Comma-separated scopes", "")
    .option("-p, --preset <preset>", "Scope preset name")
    .option("--port <port>", "Callback server port", parseInt)
    .option("-a, --account <account>", "Account name", "default")
    .option("--no-browser", "Print URL instead of opening browser")
    .action(async (providerId: string, opts) => {
      const registry = new ProviderRegistry();
      const providerConfig = registry.getProvider(providerId);
      if (!providerConfig) {
        logger.error(`Provider '${providerId}' not found. Run 'oauth-cli providers list' to see available providers.`);
        process.exit(1);
      }

      const scopes = registry.resolveScopes(
        providerId,
        opts.scopes ? opts.scopes.split(",").map((s: string) => s.trim()) : undefined,
        opts.preset,
      );

      const storage = await createStorage();
      const tokenManager = new TokenManager(storage);

      const result = await executeOAuthFlow({
        provider: providerId,
        providerConfig,
        tokenManager,
        scopes,
        account: opts.account,
        port: opts.port,
        noBrowser: !opts.browser,
      });

      if (!result.success) {
        logger.error(`Authentication failed: ${result.error}`);
        process.exit(1);
      }

      logger.info(`Authenticated as account '${result.account}' with ${providerId}.`);
      if (result.expires_at) {
        logger.info(`Token expires: ${new Date(result.expires_at).toLocaleString()}`);
      }
    });
}
