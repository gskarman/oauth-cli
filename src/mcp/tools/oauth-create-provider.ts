import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProviderRegistry } from "../../providers/registry.js";

export function registerCreateProviderTool(server: McpServer): void {
  server.tool(
    "oauth_create_provider",
    "Create a new OAuth2 provider configuration. Use this to set up authentication with any OAuth2-compatible service.",
    {
      id: z.string().describe("Provider ID slug, e.g. 'google', 'github', 'my-api'"),
      name: z.string().describe("Human-readable provider name"),
      authorize_url: z.string().url().describe("OAuth2 authorization endpoint URL"),
      token_url: z.string().url().describe("OAuth2 token endpoint URL"),
      revoke_url: z.string().url().optional().describe("Token revocation endpoint URL"),
      client_id: z.string().describe("OAuth2 client ID"),
      client_secret: z.string().optional().describe("OAuth2 client secret (omit for public clients)"),
      scopes: z.array(z.string()).default([]).describe("Default scopes to request"),
      scope_presets: z
        .record(
          z.object({
            description: z.string(),
            scopes: z.array(z.string()),
          }),
        )
        .optional()
        .describe("Named scope presets for common use cases"),
      custom_params: z.record(z.string()).optional().describe("Additional query params for auth URL"),
      pkce: z.boolean().default(true).describe("Use PKCE (recommended, default: true)"),
      api_base_url: z.string().url().optional().describe("Base URL for API requests (enables relative URLs in oauth_api_request)"),
    },
    async (args) => {
      const registry = new ProviderRegistry();
      try {
        registry.addProvider(args.id, args);
        return {
          content: [
            {
              type: "text" as const,
              text: `Provider '${args.id}' (${args.name}) created successfully.\n\nNext step: Use oauth_login to authenticate with this provider.`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to create provider: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
