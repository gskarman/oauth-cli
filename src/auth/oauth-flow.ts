import { AuthorizationCode } from "simple-oauth2";
import type { ProviderConfig } from "../providers/types.js";
import { LocalCallbackServer } from "./callback-server.js";
import { TokenManager, type TokenResult } from "./token-manager.js";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "../utils/crypto.js";
import { openBrowser } from "../utils/browser.js";
import { logger } from "../utils/logger.js";

export interface OAuthFlowOptions {
  provider: string;
  providerConfig: ProviderConfig;
  tokenManager: TokenManager;
  scopes?: string[];
  account?: string;
  port?: number;
  noBrowser?: boolean;
}

export async function executeOAuthFlow(
  options: OAuthFlowOptions,
): Promise<TokenResult> {
  const {
    provider,
    providerConfig,
    tokenManager,
    scopes = providerConfig.scopes,
    account = "default",
    port,
    noBrowser = false,
  } = options;

  // 1. PKCE
  let codeVerifier: string | undefined;
  let codeChallenge: string | undefined;
  if (providerConfig.pkce) {
    codeVerifier = generateCodeVerifier();
    codeChallenge = generateCodeChallenge(codeVerifier);
  }

  // 2. State
  const state = generateState();

  // 3. Start callback server
  const callbackServer = new LocalCallbackServer(
    providerConfig.redirect_path || "/callback",
  );
  const callbackPromise = callbackServer.start(port);

  // Need port to be assigned before building URL
  // Small wait for server to bind
  await new Promise((r) => setTimeout(r, 50));
  const redirectUri = callbackServer.getRedirectUri();

  // 4. Build authorization URL
  const client = new AuthorizationCode({
    client: {
      id: providerConfig.client_id,
      secret: providerConfig.client_secret || "",
    },
    auth: {
      tokenHost: new URL(providerConfig.token_url).origin,
      tokenPath: new URL(providerConfig.token_url).pathname,
      authorizeHost: new URL(providerConfig.authorize_url).origin,
      authorizePath: new URL(providerConfig.authorize_url).pathname,
    },
    options: {
      authorizationMethod: providerConfig.authorization_method || "header",
    },
  });

  const authParams: Record<string, string> = {
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
    state,
    ...(providerConfig.custom_params || {}),
  };

  if (codeChallenge) {
    authParams.code_challenge = codeChallenge;
    authParams.code_challenge_method = "S256";
  }

  const authorizeUrl = client.authorizeURL(authParams);

  // 5. Open browser or print URL
  if (noBrowser) {
    logger.info(`Open this URL in your browser to authenticate:\n\n${authorizeUrl}\n`);
  } else {
    logger.info("Opening browser for authentication...");
    const opened = await openBrowser(authorizeUrl);
    if (!opened) {
      logger.info(
        `Could not open browser. Open this URL manually:\n\n${authorizeUrl}\n`,
      );
    }
  }

  // 6. Wait for callback
  let callbackResult;
  try {
    callbackResult = await callbackPromise;
  } catch (err) {
    return {
      success: false,
      provider,
      account,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Verify state
  if (callbackResult.state !== state) {
    return {
      success: false,
      provider,
      account,
      error: "State mismatch — possible CSRF attack",
    };
  }

  // 7. Exchange code for tokens
  try {
    const tokenConfig: Record<string, unknown> = {
      code: callbackResult.code,
      redirect_uri: redirectUri,
      scope: scopes.join(" "),
    };

    if (codeVerifier) {
      tokenConfig.code_verifier = codeVerifier;
    }

    const tokenResponse = await client.getToken(
      tokenConfig as { code: string; redirect_uri: string; scope?: string },
    );

    // 8. Store token
    await tokenManager.storeToken(provider, account, tokenResponse);

    const expiresAt = tokenResponse.token.expires_at
      ? new Date(tokenResponse.token.expires_at as string | number).getTime()
      : undefined;

    logger.info(`Successfully authenticated with ${provider}!`);

    return {
      success: true,
      provider,
      account,
      expires_at: expiresAt,
      scopes,
    };
  } catch (err) {
    return {
      success: false,
      provider,
      account,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
