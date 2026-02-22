import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TokenManager } from "../../auth/token-manager.js";
import { createStorage } from "../../storage/storage.js";

export function registerStatusTool(server: McpServer): void {
  server.tool(
    "oauth_status",
    "Check authentication status for all providers or a specific one. Shows whether authenticated, token expiry, and scopes — never exposes token values.",
    {
      provider: z.string().optional().describe("Specific provider ID to check (omit for all)"),
      account: z.string().default("default").describe("Account name"),
    },
    async (args) => {
      const storage = await createStorage();
      const tokenManager = new TokenManager(storage);

      if (args.provider) {
        const status = await tokenManager.getStatus(args.provider, args.account);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      const statuses = await tokenManager.listAll();
      if (statuses.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No authenticated providers. Use oauth_login to authenticate.",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(statuses, null, 2),
          },
        ],
      };
    },
  );
}
