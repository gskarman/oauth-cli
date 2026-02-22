import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProviderRegistry } from "../../providers/registry.js";

export function registerUpdateProviderTool(server: McpServer): void {
  server.tool(
    "oauth_update_provider",
    "Update fields on an existing OAuth2 provider configuration.",
    {
      id: z.string().describe("Provider ID to update"),
      name: z.string().optional().describe("New display name"),
      authorize_url: z.string().url().optional().describe("New authorization URL"),
      token_url: z.string().url().optional().describe("New token URL"),
      revoke_url: z.string().url().optional().describe("New revocation URL"),
      client_id: z.string().optional().describe("New client ID"),
      client_secret: z.string().optional().describe("New client secret"),
      scopes: z.array(z.string()).optional().describe("New default scopes"),
      scope_presets: z
        .record(
          z.object({
            description: z.string(),
            scopes: z.array(z.string()),
          }),
        )
        .optional()
        .describe("New scope presets"),
      custom_params: z.record(z.string()).optional().describe("New custom auth params"),
      pkce: z.boolean().optional().describe("Enable/disable PKCE"),
      api_base_url: z.string().url().optional().describe("New API base URL"),
    },
    async (args) => {
      const registry = new ProviderRegistry();
      const { id, ...partial } = args;

      // Remove undefined keys
      const updates = Object.fromEntries(
        Object.entries(partial).filter(([, v]) => v !== undefined),
      );

      if (Object.keys(updates).length === 0) {
        return {
          content: [{ type: "text" as const, text: "No fields to update." }],
          isError: true,
        };
      }

      try {
        registry.updateProvider(id, updates);
        return {
          content: [
            {
              type: "text" as const,
              text: `Provider '${id}' updated successfully.`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to update provider: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
