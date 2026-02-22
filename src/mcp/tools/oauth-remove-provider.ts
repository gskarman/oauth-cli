import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProviderRegistry } from "../../providers/registry.js";

export function registerRemoveProviderTool(server: McpServer): void {
  server.tool(
    "oauth_remove_provider",
    "Delete an OAuth2 provider configuration.",
    {
      id: z.string().describe("Provider ID to remove"),
    },
    async (args) => {
      const registry = new ProviderRegistry();
      try {
        registry.removeProvider(args.id);
        return {
          content: [
            {
              type: "text" as const,
              text: `Provider '${args.id}' removed successfully.`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to remove provider: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
