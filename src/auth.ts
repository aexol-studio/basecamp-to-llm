import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { URL } from "node:url";

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
  scope?: string;
}

export interface TokenCache extends TokenResponse {
  expires_at: number;
  account_id?: string | undefined;
}

export interface AuthorizationJson {
  accounts: { id: number; product: string }[];
}

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  userAgent: string;
  accountIdOverride?: string | undefined;
  tokenPath?: string | undefined;
}

export class BasecampAuth {
  private readonly config: AuthConfig;
  private readonly tokenPath: string;

  private readonly LAUNCHPAD = "https://launchpad.37signals.com";

  constructor(config?: Partial<AuthConfig>) {
    this.config = {
      clientId: config?.clientId ?? process.env["BASECAMP_CLIENT_ID"] ?? "",
      clientSecret:
        config?.clientSecret ?? process.env["BASECAMP_CLIENT_SECRET"] ?? "",
      redirectUri:
        config?.redirectUri ?? process.env["BASECAMP_REDIRECT_URI"] ?? "",
      userAgent: config?.userAgent ?? process.env["BASECAMP_USER_AGENT"] ?? "",
      accountIdOverride:
        config?.accountIdOverride ?? process.env["BASECAMP_ACCOUNT_ID"],
      tokenPath: config?.tokenPath,
    };
    this.tokenPath =
      this.config.tokenPath ??
      path.join(process.cwd(), ".basecamp", "basecamp-token.json");
  }

  private log(...args: unknown[]): void {
    if (process.env["BASECAMP_MCP_STDERR"] === "1") {
      console.error(...args);
    } else {
      console.log(...args);
    }
  }

  private validateOAuthEnv(): {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  } {
    const { clientId, clientSecret, redirectUri } = this.config;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        "Missing OAuth env: BASECAMP_CLIENT_ID/SECRET/REDIRECT_URI",
      );
    }
    return { clientId, clientSecret, redirectUri };
  }

  private async readCachedToken(): Promise<TokenCache | undefined> {
    try {
      const txt = await fs.readFile(this.tokenPath, "utf8");
      return JSON.parse(txt) as TokenCache;
    } catch {
      return undefined;
    }
  }

  private async writeCachedToken(t: TokenCache): Promise<void> {
    await fs.mkdir(path.dirname(this.tokenPath), { recursive: true });
    await fs.writeFile(this.tokenPath, JSON.stringify(t, null, 2), "utf8");
  }

  private async openUrl(url: string): Promise<void> {
    const platform = process.platform;
    const cmd =
      platform === "darwin"
        ? "open"
        : platform === "win32"
          ? "start"
          : "xdg-open";
    try {
      // best-effort; ignore failures in headless envs
      const { exec } = await import("node:child_process");
      exec(`${cmd} "${url}"`);
    } catch {
      // noop
    }
  }

  private async startLocalCallbackServer(): Promise<{ code: string }> {
    const { redirectUri } = this.validateOAuthEnv();
    const urlObj = new URL(redirectUri);
    const port = Number(urlObj.port || 80);
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        if (!req.url) return;
        const full = new URL(req.url, `${urlObj.protocol}//${urlObj.host}`);
        if (full.pathname !== urlObj.pathname) {
          res.statusCode = 404;
          res.end("Not Found");
          return;
        }
        const code = full.searchParams.get("code");
        const error = full.searchParams.get("error");
        if (error) {
          res.statusCode = 400;
          res.end("Authorization failed");
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }
        if (!code) {
          res.statusCode = 400;
          res.end("Missing code");
          return;
        }
        res.statusCode = 200;
        res.end("You can close this window and return to the CLI.");
        server.close();
        resolve({ code });
      });
      server.listen(port, () => {
        // ready
      });
      server.on("error", (e: { code?: string }) => {
        if (e.code === "EADDRINUSE") {
          reject(
            new Error(
              `Port ${port} is busy. Close other instances or change BASECAMP_REDIRECT_URI`,
            ),
          );
        } else {
          reject(e);
        }
      });
    });
  }

  private async oauthAuthorize(openBrowserFlag: boolean): Promise<string> {
    const { clientId, redirectUri } = this.validateOAuthEnv();
    const url = `${this.LAUNCHPAD}/authorization/new?type=web_server&client_id=${encodeURIComponent(
      clientId,
    )}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    this.log("\nAuthorize this app by visiting:");
    this.log(url);
    if (openBrowserFlag) await this.openUrl(url);
    try {
      const { code } = await this.startLocalCallbackServer();
      return code;
    } catch (e) {
      // In MCP mode, never use stdin — throw with the auth URL instead
      if (process.env["BASECAMP_MCP_STDERR"] === "1") {
        throw new Error(
          `Local callback server failed. Authorize manually at: ${url}\n` +
            `Underlying error: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      // CLI mode: fall back to stdin for manual code entry
      this.log(
        'Local callback failed. Paste the "code" param from redirected URL here:',
      );
      const code = await new Promise<string>((resolve) => {
        process.stdout.write("Code: ");
        process.stdin.setEncoding("utf8");
        process.stdin.once("data", (d) => resolve(String(d).trim()));
      });
      return code;
    }
  }

  private async oauthTokenFromCode(code: string): Promise<TokenResponse> {
    const { clientId, clientSecret, redirectUri } = this.validateOAuthEnv();
    const body = new URLSearchParams({
      type: "web_server",
      client_id: clientId,
      redirect_uri: redirectUri,
      client_secret: clientSecret,
      code,
    });
    const res = await fetch(`${this.LAUNCHPAD}/authorization/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok)
      throw new Error(
        `Token exchange failed: ${res.status} ${await res.text()}`,
      );
    return (await res.json()) as TokenResponse;
  }

  private async oauthRefresh(refreshToken: string): Promise<TokenResponse> {
    const { clientId, clientSecret, redirectUri } = this.validateOAuthEnv();
    const body = new URLSearchParams({
      type: "refresh",
      client_id: clientId,
      redirect_uri: redirectUri,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });
    const res = await fetch(`${this.LAUNCHPAD}/authorization/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok)
      throw new Error(
        `Token refresh failed: ${res.status} ${await res.text()}`,
      );
    return (await res.json()) as TokenResponse;
  }

  /**
   * Main entry: cached → refresh → browser OAuth.
   * When openBrowser is true (default), opens browser if no cached/refreshable token.
   */
  public async getAccessToken(options?: {
    openBrowser?: boolean;
  }): Promise<TokenCache> {
    const openBrowserFlag = options?.openBrowser ?? false;
    const cached = await this.readCachedToken();
    const now = Date.now();
    if (cached && cached.expires_at - 60_000 > now) {
      return cached;
    }
    if (cached?.refresh_token) {
      const t = await this.oauthRefresh(cached.refresh_token);
      const next: TokenCache = {
        ...t,
        expires_at: Date.now() + t.expires_in * 1000,
        account_id: cached.account_id || undefined,
      };
      await this.writeCachedToken(next);
      return next;
    }
    const code = await this.oauthAuthorize(openBrowserFlag);
    const t = await this.oauthTokenFromCode(code);
    const next: TokenCache = {
      ...t,
      expires_at: Date.now() + t.expires_in * 1000,
    };
    await this.writeCachedToken(next);
    return next;
  }

  /**
   * Resolve Basecamp account ID from authorization.json or env override.
   */
  public async resolveAccountId(accessToken: string): Promise<string> {
    if (this.config.accountIdOverride) return this.config.accountIdOverride;
    const res = await fetch(`${this.LAUNCHPAD}/authorization.json`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": this.config.userAgent || "Basecamp SDK (you@example.com)",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `HTTP ${res.status} for ${this.LAUNCHPAD}/authorization.json: ${text}`,
      );
    }
    const data = (await res.json()) as AuthorizationJson;
    const account =
      data.accounts.find((a) => a.product?.toLowerCase().includes("bc")) ||
      data.accounts[0];
    if (!account) throw new Error("No Basecamp account found for this token.");
    return String(account.id);
  }

  /**
   * Check if we have a valid (non-expired) token without triggering auth.
   */
  public async hasValidToken(): Promise<boolean> {
    const cached = await this.readCachedToken();
    if (!cached) return false;
    return cached.expires_at - 60_000 > Date.now();
  }

  /**
   * Try to get a valid token silently (cached or refresh only, no browser).
   * Returns undefined if no cached token or refresh fails.
   */
  public async tryAutoAuth(): Promise<TokenCache | undefined> {
    const cached = await this.readCachedToken();
    if (!cached) return undefined;
    const now = Date.now();
    if (cached.expires_at - 60_000 > now) {
      return cached;
    }
    if (cached.refresh_token) {
      try {
        const t = await this.oauthRefresh(cached.refresh_token);
        const next: TokenCache = {
          ...t,
          expires_at: Date.now() + t.expires_in * 1000,
          account_id: cached.account_id || undefined,
        };
        await this.writeCachedToken(next);
        return next;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * Full OAuth flow with browser (convenience wrapper around getAccessToken).
   */
  public async authenticate(openBrowser = false): Promise<TokenCache> {
    return this.getAccessToken({ openBrowser });
  }
}
