import type { Command } from "commander";
import { logger } from "../../utils/logger.js";

export function registerServeCommand(program: Command): void {
  program
    .command("serve")
    .description("Start MCP server (stdio transport)")
    .action(async () => {
      logger.info("Starting MCP server...");
      // Dynamic import to avoid loading MCP deps for non-serve commands
      const { startMcpServer } = await import("../../mcp-server.js");
      await startMcpServer();
    });
}
