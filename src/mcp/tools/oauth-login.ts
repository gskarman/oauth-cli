import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProviderRegistry } from "../../providers/registry.js";
import { TokenManager } from "../../auth/token-manager.js";
import { executeOAuthFlow } from "../../auth/oauth-flow.js";
import { createStorage } from "../../storage/storage.js";

export function registerLoginTool(server: McpServer): void {
  server.tool(
    "oauth_login",
    "Initiate browser-based OAuth2 login for a provider. Opens the user's browser to complete authentication.",
    {
      provider: z.string().describe("Provider ID to authenticate with"),
      scopes: z.array(z.string()).optional().describe("Scopes to request (overrides defaults)"),
      preset: z.string().optional().describe("Scope preset name to use"),
      account: z.string().default("default").describe("Account name for multi-account support"),
    },
    async (args) => {
      const registry = new ProviderRegistry();
      const providerConfig = registry.getProvider(args.provider);
      if (!providerConfig) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Provider '${args.provider}' not found. Use oauth_list_providers to see available providers, or oauth_create_provider to create one.`,
            },
          ],
          isError: true,
        };
      }

      const scopes = registry.resolveScopes(
        args.provider,
        args.scopes,
        args.preset,
      );

      const storage = await createStorage();
      const tokenManager = new TokenManager(storage);

      const result = await executeOAuthFlow({
        provider: args.provider,
        providerConfig,
        tokenManager,
        scopes,
        account: args.account,
      });

      if (!result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Authentication failed: ${result.error}`,
            },
          ],
          isError: true,
        };
      }

      const expiryStr = result.expires_at
        ? `Token expires: ${new Date(result.expires_at).toLocaleString()}`
        : "No expiry information";

      return {
        content: [
          {
            type: "text" as const,
            text: `Successfully authenticated with ${args.provider} (account: ${result.account}).\n${expiryStr}\nScopes: ${scopes.join(", ") || "none"}\n\nYou can now use oauth_api_request to make authenticated API calls.`,
          },
        ],
      };
    },
  );
}
