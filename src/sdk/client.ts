import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { URL } from 'node:url';
import type { AuthorizationJson, TokenCache, TokenResponse } from '../basecamp-fetcher.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string | undefined>;
  body?: unknown; // JSON body by default
  absolute?: boolean; // treat path as absolute URL
  openBrowser?: boolean; // when auth is required
}

export class BasecampClient {
  private readonly CLIENT_ID = process.env['BASECAMP_CLIENT_ID'];
  private readonly CLIENT_SECRET = process.env['BASECAMP_CLIENT_SECRET'];
  private readonly REDIRECT_URI = process.env['BASECAMP_REDIRECT_URI'];
  private readonly USER_AGENT = process.env['BASECAMP_USER_AGENT'];
  private readonly ACCOUNT_ID_OVERRIDE = process.env['BASECAMP_ACCOUNT_ID'];

  private readonly API_BASE = 'https://3.basecampapi.com';
  private readonly LAUNCHPAD = 'https://launchpad.37signals.com';
  private readonly tokenPath = path.join(process.cwd(), '.codex', 'basecamp-token.json');

  constructor() {
    if (!this.USER_AGENT) {
      throw new Error('Missing env BASECAMP_USER_AGENT');
    }
  }

  private log(...args: unknown[]): void {
    if (process.env['BASECAMP_MCP_STDERR'] === '1') {
      // eslint-disable-next-line no-console
      console.error(...args);
    } else {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  }

  private get userAgent(): string {
    const ua = this.USER_AGENT;
    if (!ua) throw new Error('Missing env BASECAMP_USER_AGENT');
    return ua;
  }

  private getOAuthEnv(): { clientId: string; clientSecret: string; redirectUri: string } {
    const clientId = this.CLIENT_ID;
    const clientSecret = this.CLIENT_SECRET;
    const redirectUri = this.REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing OAuth env: BASECAMP_CLIENT_ID/SECRET/REDIRECT_URI');
    }
    return { clientId, clientSecret, redirectUri };
  }

  // Public, generic request covering the entire Basecamp API surface
  public async request<T = unknown>(
    method: HttpMethod,
    apiPath: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const token = await this.getAccessToken(!!options.openBrowser);
    const accountId = await this.resolveAccountId(token.access_token);

    const url = this.buildUrl(apiPath, options.query, !!options.absolute, accountId);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token.access_token}`,
      'User-Agent': this.userAgent,
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    const init: Parameters<typeof fetch>[1] = { method, headers };
    if (options.body !== undefined && method !== 'GET' && method !== 'HEAD') {
      init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, init);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} for ${url}: ${text}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (method === 'HEAD') return undefined as unknown as T;
    if (contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  }

  // Convenience wrappers
  public get<T = unknown>(apiPath: string, options?: RequestOptions) {
    return this.request<T>('GET', apiPath, options);
  }
  public post<T = unknown>(apiPath: string, body?: unknown, options: RequestOptions = {}) {
    return this.request<T>('POST', apiPath, { ...options, body });
  }
  public put<T = unknown>(apiPath: string, body?: unknown, options: RequestOptions = {}) {
    return this.request<T>('PUT', apiPath, { ...options, body });
  }
  public patch<T = unknown>(apiPath: string, body?: unknown, options: RequestOptions = {}) {
    return this.request<T>('PATCH', apiPath, { ...options, body });
  }
  public delete<T = unknown>(apiPath: string, options?: RequestOptions) {
    return this.request<T>('DELETE', apiPath, options);
  }

  // Example resource helpers (non-exhaustive; generic request supports the rest)
  public listProjects() {
    return this.get('/projects.json');
  }
  public listArchivedProjects() {
    return this.get('/projects/archived.json');
  }

  // Internals
  private buildUrl(
    apiPath: string,
    query: RequestOptions['query'],
    absolute: boolean,
    accountId: string
  ): string {
    let base = apiPath.trim();
    if (!absolute) {
      base = `${this.API_BASE}/${accountId}/${base.replace(/^\//, '')}`;
    }
    const url = new URL(base);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined) continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
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
      const { exec } = await import('node:child_process');
      exec(`${cmd} "${url}"`);
    } catch {
      // ignore
    }
  }

  private async startLocalCallbackServer(): Promise<{ code: string }> {
    const { redirectUri } = this.getOAuthEnv();
    const urlObj = new URL(redirectUri);
    const port = Number(urlObj.port || 80);
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        if (!req.url) return;
        const full = new URL(req.url, `${urlObj.protocol}//${urlObj.host}`);
        if (full.pathname !== urlObj.pathname) {
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }
        const code = full.searchParams.get('code');
        const error = full.searchParams.get('error');
        if (error) {
          res.statusCode = 400;
          res.end('Authorization failed');
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }
        if (!code) {
          res.statusCode = 400;
          res.end('Missing code');
          return;
        }
        res.statusCode = 200;
        res.end('You can close this window and return to the CLI.');
        server.close();
        resolve({ code });
      });
      server.listen(port, () => {
        // ready
      });
      server.on('error', e => reject(e));
    });
  }

  private async oauthTokenFromCode(code: string): Promise<TokenResponse> {
    const { clientId, clientSecret, redirectUri } = this.getOAuthEnv();
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
    });
    if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
    return (await res.json()) as TokenResponse;
  }

  private async oauthRefresh(refreshToken: string): Promise<TokenResponse> {
    const { clientId, clientSecret, redirectUri } = this.getOAuthEnv();
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
    });
    if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
    return (await res.json()) as TokenResponse;
  }

  private async oauthAuthorize(openBrowserFlag: boolean): Promise<string> {
    const { clientId, redirectUri } = this.getOAuthEnv();
    const url = `${this.LAUNCHPAD}/authorization/new?type=web_server&client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    if (openBrowserFlag) await this.openUrl(url);
    try {
      const { code } = await this.startLocalCallbackServer();
      return code;
    } catch (e) {
      // Fallback to manual paste
      this.log('Visit and authorize:', url);
      this.log('Then paste back the "code" value.');
      const code = await new Promise<string>(resolve => {
        process.stdout.write('Code: ');
        process.stdin.setEncoding('utf8');
        process.stdin.once('data', d => resolve(String(d).trim()));
      });
      return code;
    }
  }

  private async getAccessToken(openBrowserFlag: boolean): Promise<TokenCache> {
    const cached = await this.readCachedToken();
    const now = Date.now();
    if (cached && cached.expires_at - 60_000 > now) return cached;
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
    const next: TokenCache = { ...t, expires_at: Date.now() + t.expires_in * 1000 };
    await this.writeCachedToken(next);
    return next;
  }

  private async resolveAccountId(accessToken: string): Promise<string> {
    if (this.ACCOUNT_ID_OVERRIDE) return this.ACCOUNT_ID_OVERRIDE;
    const data = await this.requestAuth<AuthorizationJson>(
      `${this.LAUNCHPAD}/authorization.json`,
      accessToken
    );
    const account =
      data.accounts.find(a => a.product?.toLowerCase().includes('bc')) || data.accounts[0];
    if (!account) throw new Error('No Basecamp account found for this token.');
    return String(account.id);
  }

  private async requestAuth<T>(url: string, accessToken: string): Promise<T> {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': this.USER_AGENT || 'Basecamp SDK (you@example.com)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} for ${url}: ${text}`);
    }
    return (await res.json()) as T;
  }
}
