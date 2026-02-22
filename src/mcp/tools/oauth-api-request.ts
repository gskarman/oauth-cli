import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProviderRegistry } from "../../providers/registry.js";
import { TokenManager } from "../../auth/token-manager.js";
import { createStorage } from "../../storage/storage.js";

export function registerApiRequestTool(server: McpServer): void {
  server.tool(
    "oauth_api_request",
    "Make an authenticated HTTP request to a provider's API. The access token is injected internally and never exposed. Supports full URLs or paths relative to the provider's api_base_url.",
    {
      provider: z.string().describe("Provider ID to make request for"),
      url: z.string().describe("Full URL or path relative to provider's api_base_url"),
      method: z
        .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
        .default("GET")
        .describe("HTTP method"),
      body: z.string().optional().describe("Request body (JSON string)"),
      headers: z.record(z.string()).optional().describe("Additional request headers"),
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

      try {
        const result = await tokenManager.makeAuthenticatedRequest(
          args.provider,
          args.account,
          providerConfig,
          args.url,
          args.method,
          args.body,
          args.headers,
        );

        // Try to pretty-print JSON responses
        let bodyText = result.body;
        try {
          const parsed = JSON.parse(result.body);
          bodyText = JSON.stringify(parsed, null, 2);
        } catch {
          // Not JSON, use as-is
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `HTTP ${result.status}\n\n${bodyText}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Request failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
