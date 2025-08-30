import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { URL } from 'node:url';
import { ListCardsResponse } from './basecamp-types.js';

export interface FetchOptions {
  tableName?: string | undefined;
  columnName?: string | undefined;
  outputPath?: string | undefined;
  openBrowser?: boolean | undefined;
}

export interface Project {
  id: number;
  name: string;
  archived: boolean;
}

export interface ProjectDetails extends Project {
  dock?: {
    id: number;
    title: string;
    name: string; // e.g. 'kanban_board', 'todoset'
    enabled: boolean;
    url: string;
    app_url: string;
  }[];
}

export interface Card {
  id: number;
  title?: string;
  name?: string;
  status?: string;
  archived?: boolean;
}

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

export class BasecampFetcher {
  private readonly CLIENT_ID = process.env['BASECAMP_CLIENT_ID'];
  private readonly CLIENT_SECRET = process.env['BASECAMP_CLIENT_SECRET'];
  private readonly REDIRECT_URI = process.env['BASECAMP_REDIRECT_URI'];
  private readonly USER_AGENT = process.env['BASECAMP_USER_AGENT'];
  private readonly ACCOUNT_ID_OVERRIDE = process.env['BASECAMP_ACCOUNT_ID'];

  private readonly API_BASE = 'https://3.basecampapi.com';
  private readonly LAUNCHPAD = 'https://launchpad.37signals.com';
  private readonly tokenPath = path.join(process.cwd(), '.codex', 'basecamp-token.json');

  constructor() {
    this.validateEnvironment();
  }

  private validateEnvironment(): void {
    if (!this.USER_AGENT) {
      throw new Error('Missing env BASECAMP_USER_AGENT');
    }
  }

  private async api<T>(url: string, accessToken: string): Promise<T> {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': this.USER_AGENT || 'Salonova (contact@example.com)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} for ${url}: ${text}`);
    }
    return (await res.json()) as T;
  }

  private async findProjectByName(
    name: string,
    accountId: string,
    accessToken: string
  ): Promise<ProjectDetails | undefined> {
    const projects = await this.api<Project[]>(
      `${this.API_BASE}/${accountId}/projects.json`,
      accessToken
    );
    const direct = projects.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (direct) return direct;
    // Try archived as a fallback
    const archived = await this.api<Project[]>(
      `${this.API_BASE}/${accountId}/projects/archived.json`,
      accessToken
    );
    return archived.find(p => p.name.toLowerCase() === name.toLowerCase());
  }

  private async listCards(
    projectId: number,
    tableId: number,
    accountId: string,
    accessToken: string,
    columnName?: string
  ): Promise<Card[]> {
    try {
      const table = await this.api<ListCardsResponse>(
        `${this.API_BASE}/${accountId}/buckets/${projectId}/card_tables/${tableId}.json`,
        accessToken
      );
      const lists = table?.lists ?? [];
      const filteredLists = columnName
        ? lists.filter(l => l.title?.toLowerCase() === columnName.toLowerCase())
        : lists;
      if (columnName && filteredLists.length === 0) {
        throw new Error(`Column not found: ${columnName}`);
      }
      const allCards: Card[] = [];
      for (const list of filteredLists) {
        try {
          const listCards = await this.api<Card[]>(list.cards_url, accessToken);
          for (const c of listCards) allCards.push(c);
        } catch {
          // ignore a single list failure and continue
          // eslint-disable-next-line no-empty
        }
      }
      return allCards;
    } catch {
      return [];
    }
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
      //noop
    }
  }

  private async startLocalCallbackServer(): Promise<{ code: string }> {
    const redirectUri = this.REDIRECT_URI;
    if (!redirectUri) throw new Error('Missing env BASECAMP_REDIRECT_URI');
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

  private async oauthAuthorize(openBrowserFlag: boolean): Promise<string> {
    if (!this.CLIENT_ID || !this.CLIENT_SECRET || !this.REDIRECT_URI) {
      throw new Error('Missing OAuth env: BASECAMP_CLIENT_ID/SECRET/REDIRECT_URI');
    }
    const url = `${this.LAUNCHPAD}/authorization/new?type=web_server&client_id=${encodeURIComponent(
      this.CLIENT_ID
    )}&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}`;
    console.log('\nAuthorize this app by visiting:');
    console.log(url);
    if (openBrowserFlag) await this.openUrl(url);
    try {
      const { code } = await this.startLocalCallbackServer();
      return code;
    } catch (e) {
      console.log('Local callback failed. Paste the "code" param from redirected URL here:');
      const code = await new Promise<string>(resolve => {
        process.stdout.write('Code: ');
        process.stdin.setEncoding('utf8');
        process.stdin.once('data', d => resolve(String(d).trim()));
      });
      return code;
    }
  }

  private async oauthTokenFromCode(code: string): Promise<TokenResponse> {
    if (!this.CLIENT_ID || !this.CLIENT_SECRET || !this.REDIRECT_URI) {
      throw new Error('Missing OAuth env: BASECAMP_CLIENT_ID/SECRET/REDIRECT_URI');
    }
    const body = new URLSearchParams({
      type: 'web_server',
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      client_secret: this.CLIENT_SECRET,
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
    if (!this.CLIENT_ID || !this.CLIENT_SECRET || !this.REDIRECT_URI) {
      throw new Error('Missing OAuth env: BASECAMP_CLIENT_ID/SECRET/REDIRECT_URI');
    }
    const body = new URLSearchParams({
      type: 'refresh',
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      client_secret: this.CLIENT_SECRET,
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

  private async getAccessToken(openBrowserFlag: boolean): Promise<TokenCache> {
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
    const next: TokenCache = { ...t, expires_at: Date.now() + t.expires_in * 1000 };
    await this.writeCachedToken(next);
    return next;
  }

  private async resolveAccountId(accessToken: string): Promise<string> {
    if (this.ACCOUNT_ID_OVERRIDE) return this.ACCOUNT_ID_OVERRIDE;
    const data = await this.api<AuthorizationJson>(
      `${this.LAUNCHPAD}/authorization.json`,
      accessToken
    );
    const account =
      data.accounts.find(a => a.product?.toLowerCase().includes('bc')) || data.accounts[0];
    if (!account) throw new Error('No Basecamp account found for this token.');
    return String(account.id);
  }

  public async authenticate(openBrowser = false): Promise<void> {
    await this.getAccessToken(openBrowser);
  }

  public async listProjects(): Promise<Project[]> {
    const token = await this.getAccessToken(false);
    const accountId = await this.resolveAccountId(token.access_token);

    const activeProjects = await this.api<Project[]>(
      `${this.API_BASE}/${accountId}/projects.json`,
      token.access_token
    );
    const archivedProjects = await this.api<Project[]>(
      `${this.API_BASE}/${accountId}/projects/archived.json`,
      token.access_token
    );

    return [...activeProjects, ...archivedProjects];
  }

  public async fetchTodos(projectName: string, options: FetchOptions = {}): Promise<void> {
    const token = await this.getAccessToken(options.openBrowser || false);
    const accountId = await this.resolveAccountId(token.access_token);

    console.log(`Looking up project: ${projectName}`);
    const project = await this.findProjectByName(projectName, accountId, token.access_token);
    if (!project) throw new Error(`Project not found: ${projectName}`);
    console.log(`Found project #${project.id} (${project.name})`);

    const plan: { step: string; status: 'pending' }[] = [];

    const kanbanEntries = project.dock?.filter(d => d.name === 'kanban_board' && d.enabled) ?? [];
    const selectedKanban = options.tableName
      ? (() => {
          const tn = options.tableName as string; // guarded by ternary condition
          return kanbanEntries.find(d => d.title?.toLowerCase() === tn.toLowerCase());
        })()
      : kanbanEntries[0];

    if (options.tableName && !selectedKanban) {
      throw new Error(`Kanban board not found: ${options.tableName}`);
    }

    if (selectedKanban) {
      const cards = await this.listCards(
        project.id,
        selectedKanban.id,
        accountId,
        token.access_token,
        options.columnName
      );
      for (const c of cards) {
        if (c.archived || c.status === 'archived') continue;
        const title = (c.title || c.name || '').trim();
        if (title) plan.push({ step: title, status: 'pending' });
      }
    }

    console.log(`Collected ${plan.length} open item(s)`);

    const codexDir = path.join(process.cwd(), '.codex');
    await fs.mkdir(codexDir, { recursive: true });

    const jsonPath = path.join(codexDir, 'tasks.json');
    const mdPath = path.join(codexDir, 'tasks.md');

    const outJsonPath = options.outputPath ? path.resolve(options.outputPath) : jsonPath;

    await fs.writeFile(outJsonPath, JSON.stringify({ plan }, null, 2), 'utf8');
    // Also write a human-friendly markdown variant
    const md = [
      `# Codex Tasks from Basecamp: ${project.name}`,
      '',
      ...plan.map(p => `- [ ] ${p.step}`),
      '',
    ].join('\n');
    await fs.writeFile(mdPath, md, 'utf8');

    console.log(`Wrote ${plan.length} task(s) to:`);
    console.log(`- ${outJsonPath}`);
    console.log(`- ${mdPath}`);
    console.log('You can load these into Codex CLI as a plan.');
  }
}
