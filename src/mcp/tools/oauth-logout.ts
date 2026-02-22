import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProviderRegistry } from "../../providers/registry.js";
import { TokenManager } from "../../auth/token-manager.js";
import { createStorage } from "../../storage/storage.js";

export function registerLogoutTool(server: McpServer): void {
  server.tool(
    "oauth_logout",
    "Revoke and delete stored tokens for a provider.",
    {
      provider: z.string().describe("Provider ID to log out from"),
      account: z.string().default("default").describe("Account name"),
    },
    async (args) => {
      const registry = new ProviderRegistry();
      const providerConfig = registry.getProvider(args.provider);
      if (!providerConfig) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Provider '${args.provider}' not found.`,
            },
          ],
          isError: true,
        };
      }

      const storage = await createStorage();
      const tokenManager = new TokenManager(storage);
      await tokenManager.revokeToken(args.provider, args.account, providerConfig);

      return {
        content: [
          {
            type: "text" as const,
            text: `Logged out from ${args.provider} (account: ${args.account}). Tokens have been revoked and deleted.`,
          },
        ],
      };
    },
  );
}
