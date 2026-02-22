import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./mcp/register-tools.js";
import { logger } from "./utils/logger.js";

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: "oauth-cli",
    version: "0.1.0",
  });

  registerAllTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("MCP server started on stdio transport.");
}

// If run directly (not imported)
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("mcp-server.ts");

if (isMainModule) {
  startMcpServer().catch((err) => {
    logger.error("Failed to start MCP server:", err);
    process.exit(1);
  });
}
