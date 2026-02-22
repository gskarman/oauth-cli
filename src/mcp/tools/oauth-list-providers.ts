import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProviderRegistry } from "../../providers/registry.js";

export function registerListProvidersTool(server: McpServer): void {
  server.tool(
    "oauth_list_providers",
    "List all configured OAuth2 providers with their settings.",
    {},
    async () => {
      const registry = new ProviderRegistry();
      const providers = registry.listProviders();

      if (providers.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No providers configured. Use oauth_create_provider to add one.",
            },
          ],
        };
      }

      const list = providers.map(({ id, config }) => ({
        id,
        name: config.name,
        authorize_url: config.authorize_url,
        token_url: config.token_url,
        client_id: config.client_id,
        scopes: config.scopes,
        pkce: config.pkce,
        api_base_url: config.api_base_url,
        scope_presets: config.scope_presets
          ? Object.entries(config.scope_presets).map(([name, preset]) => ({
              name,
              description: preset.description,
              scopes: preset.scopes,
            }))
          : undefined,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(list, null, 2),
          },
        ],
      };
    },
  );
}
