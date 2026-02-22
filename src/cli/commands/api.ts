import type { Command } from "commander";
import { ProviderRegistry } from "../../providers/registry.js";
import { TokenManager } from "../../auth/token-manager.js";
import { createStorage } from "../../storage/storage.js";
import { logger } from "../../utils/logger.js";

export function registerApiCommand(program: Command): void {
  program
    .command("api <provider> <url>")
    .description("Make an authenticated HTTP request")
    .option("-m, --method <method>", "HTTP method", "GET")
    .option("-b, --body <body>", "Request body (JSON)")
    .option("-H, --header <headers...>", "Headers in Key:Value format")
    .option("-a, --account <account>", "Account name", "default")
    .action(async (providerId: string, url: string, opts) => {
      const registry = new ProviderRegistry();
      const providerConfig = registry.getProvider(providerId);
      if (!providerConfig) {
        logger.error(`Provider '${providerId}' not found.`);
        process.exit(1);
      }

      const storage = await createStorage();
      const tokenManager = new TokenManager(storage);

      const headers: Record<string, string> = {};
      if (opts.header) {
        for (const h of opts.header) {
          const idx = h.indexOf(":");
          if (idx > 0) {
            headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
          }
        }
      }

      try {
        const result = await tokenManager.makeAuthenticatedRequest(
          providerId,
          opts.account,
          providerConfig,
          url,
          opts.method.toUpperCase(),
          opts.body,
          Object.keys(headers).length > 0 ? headers : undefined,
        );

        logger.info(`HTTP ${result.status}`);

        // Output response body to stdout for piping
        console.log(result.body);
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
