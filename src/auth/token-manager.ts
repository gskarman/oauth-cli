import { AuthorizationCode, type AccessToken, type Token } from "simple-oauth2";
import type { ITokenStorage, StoredTokenData } from "../storage/storage.js";
import type { ProviderConfig } from "../providers/types.js";
import { logger } from "../utils/logger.js";

export interface TokenResult {
  success: boolean;
  provider: string;
  account: string;
  expires_at?: number;
  scopes?: string[];
  error?: string;
}

export type TokenStatus = {
  provider: string;
  account: string;
  authenticated: boolean;
  expires_at?: number;
  expired?: boolean;
  scopes?: string[];
};

const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export class TokenManager {
  constructor(private storage: ITokenStorage) {}

  async storeToken(
    provider: string,
    account: string,
    tokenResponse: AccessToken,
  ): Promise<void> {
    const token = tokenResponse.token;
    const data: StoredTokenData = {
      access_token: token.access_token as string,
      refresh_token: token.refresh_token as string | undefined,
      token_type: (token.token_type as string) || "Bearer",
      expires_at: token.expires_at
        ? new Date(token.expires_at as string | number).getTime()
        : undefined,
      scopes: token.scope
        ? (token.scope as string).split(" ").filter(Boolean)
        : undefined,
      raw: token,
    };
    await this.storage.store(provider, account, data);
  }

  async getValidToken(
    provider: string,
    account: string,
    providerConfig: ProviderConfig,
  ): Promise<StoredTokenData | null> {
    const data = await this.storage.retrieve(provider, account);
    if (!data) return null;

    // Check if token is expired (with buffer)
    if (data.expires_at && Date.now() > data.expires_at - EXPIRY_BUFFER_MS) {
      if (!data.refresh_token) {
        logger.warn(
          `Token for ${provider}/${account} is expired and no refresh token available`,
        );
        return null;
      }

      // Attempt refresh
      try {
        const refreshed = await this.refreshToken(
          provider,
          account,
          data,
          providerConfig,
        );
        return refreshed;
      } catch (err) {
        logger.error(`Failed to refresh token for ${provider}/${account}:`, err);
        return null;
      }
    }

    return data;
  }

  private async refreshToken(
    provider: string,
    account: string,
    data: StoredTokenData,
    providerConfig: ProviderConfig,
  ): Promise<StoredTokenData> {
    logger.info(`Refreshing token for ${provider}/${account}...`);

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

    const accessToken = client.createToken({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      expires_at: data.expires_at
        ? new Date(data.expires_at).toISOString()
        : undefined,
    });

    const refreshed = await accessToken.refresh();
    const newToken = refreshed.token;

    const newData: StoredTokenData = {
      access_token: newToken.access_token as string,
      refresh_token:
        (newToken.refresh_token as string | undefined) || data.refresh_token,
      token_type: (newToken.token_type as string) || "Bearer",
      expires_at: newToken.expires_at
        ? new Date(newToken.expires_at as string | number).getTime()
        : undefined,
      scopes: newToken.scope
        ? (newToken.scope as string).split(" ").filter(Boolean)
        : data.scopes,
      raw: newToken as Record<string, unknown>,
    };

    await this.storage.store(provider, account, newData);
    logger.info(`Token refreshed for ${provider}/${account}`);
    return newData;
  }

  async revokeToken(
    provider: string,
    account: string,
    providerConfig: ProviderConfig,
  ): Promise<void> {
    if (providerConfig.revoke_url) {
      const data = await this.storage.retrieve(provider, account);
      if (data) {
        try {
          await fetch(providerConfig.revoke_url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ token: data.access_token }),
          });
          logger.info(`Token revoked at provider for ${provider}/${account}`);
        } catch (err) {
          logger.warn(`Failed to revoke token at provider:`, err);
        }
      }
    }

    await this.storage.delete(provider, account);
    logger.info(`Token deleted for ${provider}/${account}`);
  }

  async getStatus(provider: string, account: string): Promise<TokenStatus> {
    const data = await this.storage.retrieve(provider, account);
    if (!data) {
      return { provider, account, authenticated: false };
    }

    const now = Date.now();
    const expired = data.expires_at ? now > data.expires_at : false;

    return {
      provider,
      account,
      authenticated: true,
      expires_at: data.expires_at,
      expired,
      scopes: data.scopes,
    };
  }

  async listAll(): Promise<TokenStatus[]> {
    const entries = await this.storage.list();
    const statuses: TokenStatus[] = [];
    for (const { provider, account } of entries) {
      statuses.push(await this.getStatus(provider, account));
    }
    return statuses;
  }

  async makeAuthenticatedRequest(
    provider: string,
    account: string,
    providerConfig: ProviderConfig,
    url: string,
    method: string = "GET",
    body?: string,
    headers?: Record<string, string>,
  ): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    const token = await this.getValidToken(provider, account, providerConfig);
    if (!token) {
      throw new Error(
        `No valid token for ${provider}/${account}. Please authenticate first.`,
      );
    }

    // Resolve URL: if relative and api_base_url is set, prepend it
    let fullUrl = url;
    if (!url.startsWith("http") && providerConfig.api_base_url) {
      const base = providerConfig.api_base_url.replace(/\/+$/, "");
      const path = url.startsWith("/") ? url : `/${url}`;
      fullUrl = `${base}${path}`;
    }

    const requestHeaders: Record<string, string> = {
      Authorization: `${token.token_type || "Bearer"} ${token.access_token}`,
      ...headers,
    };

    if (body && !requestHeaders["Content-Type"]) {
      requestHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(fullUrl, {
      method,
      headers: requestHeaders,
      body: body || undefined,
    });

    const responseBody = await response.text();
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      headers: responseHeaders,
      body: responseBody,
    };
  }
}
