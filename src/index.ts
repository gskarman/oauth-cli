#!/usr/bin/env node

import { Command } from "commander";
import { registerLoginCommand } from "./cli/commands/login.js";
import { registerLogoutCommand } from "./cli/commands/logout.js";
import { registerTokenCommand } from "./cli/commands/token.js";
import { registerStatusCommand } from "./cli/commands/status.js";
import { registerProvidersCommand } from "./cli/commands/providers.js";
import { registerApiCommand } from "./cli/commands/api.js";
import { registerServeCommand } from "./cli/commands/serve.js";

const program = new Command();

program
  .name("oauth-cli")
  .description(
    "Generic OAuth2 CLI — authenticate with any provider, securely store tokens, and expose an MCP server for AI-agent integration",
  )
  .version("0.1.0");

registerLoginCommand(program);
registerLogoutCommand(program);
registerTokenCommand(program);
registerStatusCommand(program);
registerProvidersCommand(program);
registerApiCommand(program);
registerServeCommand(program);

program.parse();
