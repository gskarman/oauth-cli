# oauth-cli

Generic OAuth2 CLI + MCP Server for authenticating with any OAuth2 provider, securely storing tokens, and exposing an MCP server for AI-agent integration.

## Quick Start

```bash
# CLI usage
npx tsx src/index.ts <command>
npm run dev -- <command>

# MCP server (launched automatically via .mcp.json)
npx tsx src/mcp-server.ts
```

## Commands

- `login <provider>` — Browser OAuth flow (--scopes, --preset, --port, --account, --no-browser)
- `logout <provider>` — Revoke + delete tokens (--account)
- `token <provider>` — Print access token to stdout (--account, --raw)
- `status` — Show auth status for all providers
- `providers list|add|update|remove` — Manage provider configs
- `api <provider> <url>` — Authenticated HTTP request (--method, --body, --header, --account)
- `serve` — Start MCP server (stdio transport)

## Testing

```bash
npm test            # run all tests
npm run test:watch  # watch mode
```

## Architecture

- **src/providers/** — Provider config types (Zod-validated) and registry (CRUD, stored in ~/.oauth-cli/config.json)
- **src/auth/** — OAuth flow (PKCE + state), callback server (node:http), token manager (refresh, revoke, makeAuthenticatedRequest)
- **src/storage/** — ITokenStorage interface, OS keychain adapter (@napi-rs/keyring), AES-256-GCM encrypted file fallback
- **src/cli/commands/** — Commander CLI commands
- **src/mcp/** — MCP server tools (8 tools for provider management, auth, and API requests)
- **src/utils/** — Config management, logger (all output to stderr), browser opener, crypto (PKCE, AES-256-GCM)

## Security

- PKCE enabled by default for all providers
- Tokens never exposed via MCP tools — `oauth_api_request` injects auth headers internally
- OS keychain primary storage; encrypted file fallback uses AES-256-GCM with user passphrase (scrypt-derived key)
- `oauth_get_token` is CLI-only (for human/script use), not available as MCP tool

## Key Files

| File | Purpose |
|---|---|
| `src/index.ts` | CLI entry point |
| `src/mcp-server.ts` | MCP server entry point |
| `src/providers/registry.ts` | Provider CRUD + validation |
| `src/auth/oauth-flow.ts` | Full OAuth2 flow orchestration |
| `src/auth/token-manager.ts` | Token lifecycle + authenticated requests |
| `src/storage/storage.ts` | Storage interface + factory |
