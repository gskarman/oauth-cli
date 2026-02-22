// All output to stderr — critical for MCP mode where stdout = JSON-RPC

export const logger = {
  info(...args: unknown[]) {
    console.error("[oauth-cli]", ...args);
  },
  warn(...args: unknown[]) {
    console.error("[oauth-cli] WARN:", ...args);
  },
  error(...args: unknown[]) {
    console.error("[oauth-cli] ERROR:", ...args);
  },
  debug(...args: unknown[]) {
    if (process.env.OAUTH_CLI_DEBUG) {
      console.error("[oauth-cli] DEBUG:", ...args);
    }
  },
};
