import { BasecampAuth } from "./auth.js";

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

export class BasecampFetcher {
  private readonly USER_AGENT = process.env["BASECAMP_USER_AGENT"];

  private readonly API_BASE = "https://3.basecampapi.com";

  private readonly auth: BasecampAuth;

  constructor() {
    this.validateEnvironment();
    this.auth = new BasecampAuth();
  }

  private validateEnvironment(): void {
    if (!this.USER_AGENT) {
      throw new Error("Missing env BASECAMP_USER_AGENT");
    }
  }

  private async api<T>(url: string, accessToken: string): Promise<T> {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": this.USER_AGENT || "Salonova (contact@example.com)",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} for ${url}: ${text}`);
    }
    return (await res.json()) as T;
  }

  public async authenticate(openBrowser = false): Promise<void> {
    await this.auth.getAccessToken({ openBrowser });
  }

  public async listProjects(): Promise<Project[]> {
    const token = await this.auth.getAccessToken();
    const accountId = await this.auth.resolveAccountId(token.access_token);

    const activeProjects = await this.api<Project[]>(
      `${this.API_BASE}/${accountId}/projects.json`,
      token.access_token,
    );
    return activeProjects;
  }
}
