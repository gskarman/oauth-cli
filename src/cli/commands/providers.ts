import type { Command } from "commander";
import { createInterface } from "node:readline";
import { ProviderRegistry } from "../../providers/registry.js";
import { logger } from "../../utils/logger.js";

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function registerProvidersCommand(program: Command): void {
  const providers = program
    .command("providers")
    .description("Manage OAuth2 provider configurations");

  providers
    .command("list")
    .description("List all configured providers")
    .action(() => {
      const registry = new ProviderRegistry();
      const list = registry.listProviders();

      if (list.length === 0) {
        logger.info("No providers configured. Use 'oauth-cli providers add' to add one.");
        return;
      }

      logger.info("Configured providers:\n");
      for (const { id, config } of list) {
        logger.info(`  ${id}: ${config.name}`);
        logger.info(`    Auth URL: ${config.authorize_url}`);
        logger.info(`    Token URL: ${config.token_url}`);
        logger.info(`    Client ID: ${config.client_id}`);
        logger.info(`    PKCE: ${config.pkce}`);
        if (config.scopes.length > 0) {
          logger.info(`    Scopes: ${config.scopes.join(", ")}`);
        }
        if (config.api_base_url) {
          logger.info(`    API Base: ${config.api_base_url}`);
        }
        logger.info("");
      }
    });

  providers
    .command("add")
    .description("Interactively add a new provider configuration")
    .action(async () => {
      const registry = new ProviderRegistry();

      const id = await prompt("Provider ID (e.g., google, github): ");
      const name = await prompt("Display name: ");
      const authorize_url = await prompt("Authorization URL: ");
      const token_url = await prompt("Token URL: ");
      const client_id = await prompt("Client ID: ");
      const client_secret = await prompt("Client Secret (leave blank if none): ");
      const scopesRaw = await prompt("Default scopes (comma-separated): ");
      const pkceRaw = await prompt("Use PKCE? (y/n, default: y): ");
      const api_base_url = await prompt("API Base URL (leave blank if none): ");

      try {
        registry.addProvider(id, {
          name,
          authorize_url,
          token_url,
          client_id,
          client_secret: client_secret || undefined,
          scopes: scopesRaw ? scopesRaw.split(",").map((s) => s.trim()) : [],
          pkce: pkceRaw.toLowerCase() !== "n",
          api_base_url: api_base_url || undefined,
        });
        logger.info(`Provider '${id}' added successfully!`);
      } catch (err) {
        logger.error("Failed to add provider:", err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  providers
    .command("update <id>")
    .description("Update a provider configuration")
    .option("--name <name>", "Update display name")
    .option("--authorize-url <url>", "Update authorization URL")
    .option("--token-url <url>", "Update token URL")
    .option("--client-id <id>", "Update client ID")
    .option("--client-secret <secret>", "Update client secret")
    .option("--scopes <scopes>", "Update default scopes (comma-separated)")
    .option("--pkce <enabled>", "Enable/disable PKCE (true/false)")
    .option("--api-base-url <url>", "Update API base URL")
    .action((id: string, opts) => {
      const registry = new ProviderRegistry();
      const partial: Record<string, unknown> = {};

      if (opts.name) partial.name = opts.name;
      if (opts.authorizeUrl) partial.authorize_url = opts.authorizeUrl;
      if (opts.tokenUrl) partial.token_url = opts.tokenUrl;
      if (opts.clientId) partial.client_id = opts.clientId;
      if (opts.clientSecret) partial.client_secret = opts.clientSecret;
      if (opts.scopes) partial.scopes = opts.scopes.split(",").map((s: string) => s.trim());
      if (opts.pkce !== undefined) partial.pkce = opts.pkce === "true";
      if (opts.apiBaseUrl) partial.api_base_url = opts.apiBaseUrl;

      if (Object.keys(partial).length === 0) {
        logger.error("No fields to update. Use --help to see options.");
        process.exit(1);
      }

      try {
        registry.updateProvider(id, partial);
        logger.info(`Provider '${id}' updated.`);
      } catch (err) {
        logger.error("Failed:", err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  providers
    .command("remove <id>")
    .description("Delete a provider configuration")
    .action((id: string) => {
      const registry = new ProviderRegistry();
      try {
        registry.removeProvider(id);
        logger.info(`Provider '${id}' removed.`);
      } catch (err) {
        logger.error("Failed:", err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
