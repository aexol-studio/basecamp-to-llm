import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { URL } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';

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

  private readonly LAUNCHPAD = 'https://launchpad.37signals.com';

  constructor(config?: Partial<AuthConfig>) {
    this.config = {
      clientId: config?.clientId ?? process.env['BASECAMP_CLIENT_ID'] ?? '',
      clientSecret: config?.clientSecret ?? process.env['BASECAMP_CLIENT_SECRET'] ?? '',
      redirectUri: config?.redirectUri ?? process.env['BASECAMP_REDIRECT_URI'] ?? '',
      userAgent: config?.userAgent ?? process.env['BASECAMP_USER_AGENT'] ?? '',
      accountIdOverride: config?.accountIdOverride ?? process.env['BASECAMP_ACCOUNT_ID'],
      tokenPath: config?.tokenPath,
    };
    this.tokenPath =
      this.config.tokenPath ?? path.join(process.cwd(), '.basecamp', 'basecamp-token.json');
  }

  private log(...args: unknown[]): void {
    if (process.env['BASECAMP_MCP_STDERR'] === '1') {
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
      throw new Error('Missing OAuth env: BASECAMP_CLIENT_ID/SECRET/REDIRECT_URI');
    }
    return { clientId, clientSecret, redirectUri };
  }

  private async readCachedToken(): Promise<TokenCache | undefined> {
    try {
      const txt = await fs.readFile(this.tokenPath, 'utf8');
      return JSON.parse(txt) as TokenCache;
    } catch {
      return undefined;
    }
  }

  private async writeCachedToken(t: TokenCache): Promise<void> {
    await fs.mkdir(path.dirname(this.tokenPath), { recursive: true });
    await fs.writeFile(this.tokenPath, JSON.stringify(t, null, 2), 'utf8');
  }

  private async openUrl(url: string): Promise<void> {
    const platform = process.platform;
    const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
    try {
      // best-effort; ignore failures in headless envs
      const { exec } = await import('node:child_process');
      exec(`${cmd} "${url}"`);
    } catch {
      // noop
    }
  }

  private validatedLoopbackRedirect(): { url: URL; bindHost: string } {
    const { redirectUri } = this.validateOAuthEnv();
    let url: URL;
    try {
      url = new URL(redirectUri);
    } catch {
      throw new Error('Invalid BASECAMP_REDIRECT_URI: expected an absolute loopback URL');
    }

    if (url.protocol !== 'http:') {
      throw new Error('Invalid BASECAMP_REDIRECT_URI: local OAuth callbacks must use http');
    }
    if (url.username || url.password) {
      throw new Error('Invalid BASECAMP_REDIRECT_URI: credentials are not allowed');
    }

    const hostname = url.hostname.toLowerCase();
    const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
    if (!loopbackHosts.has(hostname)) {
      throw new Error(
        'Invalid BASECAMP_REDIRECT_URI: callback host must be localhost, 127.0.0.1, or ::1'
      );
    }

    return { url, bindHost: hostname === '[::1]' ? '::1' : hostname };
  }

  private statesMatch(expected: string, received: string): boolean {
    const expectedBytes = Buffer.from(expected);
    const receivedBytes = Buffer.from(received);
    return (
      expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes)
    );
  }

  private async startLocalCallbackServer(expectedState: string): Promise<{ code: string }> {
    const { url: urlObj, bindHost } = this.validatedLoopbackRedirect();
    const port = Number(urlObj.port || 80);
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        if (!req.url) return;
        const full = new URL(req.url, `${urlObj.protocol}//${urlObj.host}`);
        if (full.origin !== urlObj.origin || full.pathname !== urlObj.pathname) {
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }
        const code = full.searchParams.get('code');
        const error = full.searchParams.get('error');
        const state = full.searchParams.get('state');
        if (!state || !this.statesMatch(expectedState, state)) {
          res.statusCode = 400;
          res.end('Invalid OAuth state');
          return;
        }
        if (error) {
          res.statusCode = 400;
          res.end('Authorization failed');
          server.close(() => reject(new Error(`OAuth error: ${error}`)));
          return;
        }
        if (!code) {
          res.statusCode = 400;
          res.end('Missing code');
          return;
        }
        res.statusCode = 200;
        res.end('You can close this window and return to the CLI.');
        server.close(closeError => {
          if (closeError) {
            reject(closeError);
          } else {
            resolve({ code });
          }
        });
      });
      server.listen(port, bindHost, () => {
        // ready
      });
      server.on('error', (e: { code?: string }) => {
        if (e.code === 'EADDRINUSE') {
          reject(
            new Error(`Port ${port} is busy. Close other instances or change BASECAMP_REDIRECT_URI`)
          );
        } else {
          reject(e);
        }
      });
    });
  }

  private async oauthAuthorize(openBrowserFlag: boolean): Promise<string> {
    const { clientId, redirectUri } = this.validateOAuthEnv();
    this.validatedLoopbackRedirect();
    const state = randomBytes(32).toString('base64url');
    const authorizationUrl = new URL(`${this.LAUNCHPAD}/authorization/new`);
    authorizationUrl.search = new URLSearchParams({
      type: 'web_server',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    }).toString();
    const url = authorizationUrl.toString();
    this.log('\nAuthorize this app by visiting:');
    this.log(url);
    if (openBrowserFlag) await this.openUrl(url);
    try {
      const { code } = await this.startLocalCallbackServer(state);
      return code;
    } catch (e) {
      // In MCP mode, never use stdin — throw with the auth URL instead
      if (process.env['BASECAMP_MCP_STDERR'] === '1') {
        throw new Error(
          `Local callback server failed. Authorize manually at: ${url}\n` +
            `Underlying error: ${e instanceof Error ? e.message : String(e)}`
        );
      }
      // CLI mode: validate state from the full redirected URL before accepting its code.
      this.log('Local callback failed. Paste the full redirected URL here:');
      const redirectedUrl = await new Promise<string>(resolve => {
        process.stdout.write('Redirected URL: ');
        process.stdin.setEncoding('utf8');
        process.stdin.once('data', d => resolve(String(d).trim()));
      });
      let callbackUrl: URL;
      try {
        callbackUrl = new URL(redirectedUrl);
      } catch {
        throw new Error('Invalid OAuth callback URL');
      }
      const { url: expectedRedirect } = this.validatedLoopbackRedirect();
      if (
        callbackUrl.origin !== expectedRedirect.origin ||
        callbackUrl.pathname !== expectedRedirect.pathname
      ) {
        throw new Error('OAuth callback URL does not match BASECAMP_REDIRECT_URI');
      }
      const callbackState = callbackUrl.searchParams.get('state');
      if (!callbackState || !this.statesMatch(state, callbackState)) {
        throw new Error('Invalid OAuth state in manual callback');
      }
      const callbackError = callbackUrl.searchParams.get('error');
      if (callbackError) throw new Error(`OAuth error: ${callbackError}`);
      const code = callbackUrl.searchParams.get('code');
      if (!code) throw new Error('Missing OAuth code in manual callback');
      return code;
    }
  }

  private async oauthTokenFromCode(code: string): Promise<TokenResponse> {
    const { clientId, clientSecret, redirectUri } = this.validateOAuthEnv();
    const body = new URLSearchParams({
      type: 'web_server',
      client_id: clientId,
      redirect_uri: redirectUri,
      client_secret: clientSecret,
      code,
    });
    const res = await fetch(`${this.LAUNCHPAD}/authorization/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      redirect: 'manual',
    });
    if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
    return (await res.json()) as TokenResponse;
  }

  private async oauthRefresh(refreshToken: string): Promise<TokenResponse> {
    const { clientId, clientSecret, redirectUri } = this.validateOAuthEnv();
    const body = new URLSearchParams({
      type: 'refresh',
      client_id: clientId,
      redirect_uri: redirectUri,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });
    const res = await fetch(`${this.LAUNCHPAD}/authorization/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      redirect: 'manual',
    });
    if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
    return (await res.json()) as TokenResponse;
  }

  /**
   * Main entry: cached → refresh → browser OAuth.
   * When openBrowser is true, opens a browser if no cached/refreshable token.
   * The default is false so headless and programmatic callers do not launch a browser unexpectedly.
   */
  public async getAccessToken(options?: { openBrowser?: boolean }): Promise<TokenCache> {
    const openBrowserFlag = options?.openBrowser ?? false;
    const cached = await this.readCachedToken();
    const now = Date.now();
    if (cached && cached.expires_at - 60_000 > now) {
      return cached;
    }
    if (cached?.refresh_token) {
      let refreshed: TokenResponse | undefined;
      try {
        refreshed = await this.oauthRefresh(cached.refresh_token);
      } catch {
        // Continue to interactive/manual OAuth when the cached refresh token is stale.
      }
      if (refreshed) {
        const next: TokenCache = {
          ...refreshed,
          refresh_token: refreshed.refresh_token ?? cached.refresh_token,
          expires_at: Date.now() + refreshed.expires_in * 1000,
          account_id: cached.account_id || undefined,
        };
        await this.writeCachedToken(next);
        return next;
      }
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
   * Resolve the Basecamp account ID from BASECAMP_ACCOUNT_ID/config override or authorization.json.
   */
  public async resolveAccountId(accessToken: string): Promise<string> {
    if (this.config.accountIdOverride) return this.config.accountIdOverride;
    const res = await fetch(`${this.LAUNCHPAD}/authorization.json`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': this.config.userAgent || 'Basecamp SDK (you@example.com)',
        Accept: 'application/json',
      },
      redirect: 'manual',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} for ${this.LAUNCHPAD}/authorization.json: ${text}`);
    }
    const data = (await res.json()) as AuthorizationJson;
    const account =
      data.accounts.find(a => a.product?.toLowerCase().includes('bc')) || data.accounts[0];
    if (!account) throw new Error('No Basecamp account found for this token.');
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
          refresh_token: t.refresh_token ?? cached.refresh_token,
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
   * Full OAuth flow, optionally opening a browser (default: false).
   */
  public async authenticate(openBrowser = false): Promise<TokenCache> {
    return this.getAccessToken({ openBrowser });
  }
}
