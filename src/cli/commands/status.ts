import type { Command } from "commander";
import { TokenManager } from "../../auth/token-manager.js";
import { createStorage } from "../../storage/storage.js";
import { logger } from "../../utils/logger.js";

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show authentication status for all providers")
    .action(async () => {
      const storage = await createStorage();
      const tokenManager = new TokenManager(storage);
      const statuses = await tokenManager.listAll();

      if (statuses.length === 0) {
        logger.info("No authenticated providers. Use 'oauth-cli login <provider>' to authenticate.");
        return;
      }

      logger.info("Authentication status:\n");
      for (const s of statuses) {
        const expiryStr = s.expires_at
          ? `expires ${new Date(s.expires_at).toLocaleString()}`
          : "no expiry info";
        const statusStr = s.expired ? "EXPIRED" : "active";
        const scopeStr = s.scopes?.length ? `scopes: ${s.scopes.join(", ")}` : "";
        logger.info(
          `  ${s.provider}/${s.account}: ${statusStr} (${expiryStr})${scopeStr ? ` [${scopeStr}]` : ""}`,
        );
      }
    });
}
