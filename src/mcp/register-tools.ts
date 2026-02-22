import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCreateProviderTool } from "./tools/oauth-create-provider.js";
import { registerUpdateProviderTool } from "./tools/oauth-update-provider.js";
import { registerRemoveProviderTool } from "./tools/oauth-remove-provider.js";
import { registerListProvidersTool } from "./tools/oauth-list-providers.js";
import { registerLoginTool } from "./tools/oauth-login.js";
import { registerLogoutTool } from "./tools/oauth-logout.js";
import { registerStatusTool } from "./tools/oauth-status.js";
import { registerApiRequestTool } from "./tools/oauth-api-request.js";

export function registerAllTools(server: McpServer): void {
  registerCreateProviderTool(server);
  registerUpdateProviderTool(server);
  registerRemoveProviderTool(server);
  registerListProvidersTool(server);
  registerLoginTool(server);
  registerLogoutTool(server);
  registerStatusTool(server);
  registerApiRequestTool(server);
}
