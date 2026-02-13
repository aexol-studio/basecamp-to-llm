import { URL } from "node:url";
import { BasecampAuth } from "../auth.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string | undefined>;
  body?: unknown; // JSON body by default
  absolute?: boolean; // treat path as absolute URL
  openBrowser?: boolean; // when auth is required
}

export class BasecampClient {
  private readonly USER_AGENT = process.env["BASECAMP_USER_AGENT"];

  private readonly API_BASE = "https://3.basecampapi.com";

  private readonly auth: BasecampAuth;

  constructor() {
    if (!this.USER_AGENT) {
      throw new Error("Missing env BASECAMP_USER_AGENT");
    }
    this.auth = new BasecampAuth();
  }

  private get userAgent(): string {
    const ua = this.USER_AGENT;
    if (!ua) throw new Error("Missing env BASECAMP_USER_AGENT");
    return ua;
  }

  // Public, generic request covering the entire Basecamp API surface
  public async request<T = unknown>(
    method: HttpMethod,
    apiPath: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const token = await this.auth.getAccessToken({
      openBrowser: !!options.openBrowser,
    });
    const accountId = await this.auth.resolveAccountId(token.access_token);

    const url = this.buildUrl(
      apiPath,
      options.query,
      !!options.absolute,
      accountId,
    );
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token.access_token}`,
      "User-Agent": this.userAgent,
      Accept: "application/json",
      ...(options.headers || {}),
    };

    const init: Parameters<typeof fetch>[1] = { method, headers };
    if (options.body !== undefined && method !== "GET" && method !== "HEAD") {
      init.body =
        typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body);
      if (!headers["Content-Type"])
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(url, init);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} for ${url}: ${text}`);
    }
    const contentType = res.headers.get("content-type") || "";
    if (method === "HEAD") return undefined as unknown as T;
    if (contentType.includes("application/json")) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  }

  // Convenience wrappers
  public get<T = unknown>(apiPath: string, options?: RequestOptions) {
    return this.request<T>("GET", apiPath, options);
  }

  /**
   * Fetch all pages of a paginated resource using Link header
   * Basecamp API uses RFC5988 Link header with rel="next" for pagination
   */
  public async getAllPages<T>(
    apiPath: string,
    options: RequestOptions = {},
  ): Promise<T[]> {
    const token = await this.auth.getAccessToken({
      openBrowser: !!options.openBrowser,
    });
    const accountId = await this.auth.resolveAccountId(token.access_token);

    const allItems: T[] = [];
    let nextUrl: string | null = this.buildUrl(
      apiPath,
      options.query,
      !!options.absolute,
      accountId,
    );

    while (nextUrl) {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token.access_token}`,
        "User-Agent": this.userAgent,
        Accept: "application/json",
        ...(options.headers || {}),
      };

      const res = await fetch(nextUrl, { method: "GET", headers });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} for ${nextUrl}: ${text}`);
      }

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = (await res.json()) as T[];
        if (Array.isArray(data)) {
          allItems.push(...data);
        }
      }

      // Parse Link header for next page (RFC5988)
      // Example: <https://3.basecampapi.com/.../comments.json?page=2>; rel="next"
      const linkHeader = res.headers.get("Link");
      nextUrl = this.parseNextLinkUrl(linkHeader);
    }

    return allItems;
  }

  /**
   * Parse Link header to extract next page URL
   * Format: <url>; rel="next"
   */
  private parseNextLinkUrl(linkHeader: string | null): string | null {
    if (!linkHeader) return null;

    // Match pattern: <URL>; rel="next"
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    return nextMatch?.[1] || null;
  }
  public post<T = unknown>(
    apiPath: string,
    body?: unknown,
    options: RequestOptions = {},
  ) {
    return this.request<T>("POST", apiPath, { ...options, body });
  }
  public put<T = unknown>(
    apiPath: string,
    body?: unknown,
    options: RequestOptions = {},
  ) {
    return this.request<T>("PUT", apiPath, { ...options, body });
  }
  public patch<T = unknown>(
    apiPath: string,
    body?: unknown,
    options: RequestOptions = {},
  ) {
    return this.request<T>("PATCH", apiPath, { ...options, body });
  }
  public delete<T = unknown>(apiPath: string, options?: RequestOptions) {
    return this.request<T>("DELETE", apiPath, options);
  }

  /**
   * Convert Basecamp storage/preview URLs to API URLs that work with OAuth tokens
   * storage.3.basecamp.com and preview.3.basecamp.com URLs return 404 with OAuth
   * but the same paths work on 3.basecampapi.com
   */
  private convertToApiUrl(url: string): string {
    // Convert storage.3.basecamp.com -> 3.basecampapi.com
    if (url.includes("storage.3.basecamp.com")) {
      return url.replace(
        "https://storage.3.basecamp.com",
        "https://3.basecampapi.com",
      );
    }
    // Convert preview.3.basecamp.com -> 3.basecampapi.com
    if (url.includes("preview.3.basecamp.com")) {
      return url.replace(
        "https://preview.3.basecamp.com",
        "https://3.basecampapi.com",
      );
    }
    return url;
  }

  /**
   * Download binary data (e.g., images) with authentication
   * Returns base64 encoded string
   */
  public async downloadBinary(url: string): Promise<string> {
    const token = await this.auth.getAccessToken();

    // Convert storage/preview URLs to API URLs that work with OAuth
    const apiUrl = this.convertToApiUrl(url);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token.access_token}`,
      "User-Agent": this.userAgent,
    };

    const res = await fetch(apiUrl, { method: "GET", headers });
    if (!res.ok) {
      throw new Error(`Failed to download from ${apiUrl}: ${res.statusText}`);
    }

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return base64;
  }

  // Example resource helpers (non-exhaustive; generic request supports the rest)
  public listProjects() {
    return this.get("/projects.json");
  }
  public listArchivedProjects() {
    return this.get("/projects/archived.json");
  }

  // Internals
  private buildUrl(
    apiPath: string,
    query: RequestOptions["query"],
    absolute: boolean,
    accountId: string,
  ): string {
    let base = apiPath.trim();
    if (!absolute) {
      base = `${this.API_BASE}/${accountId}/${base.replace(/^\//, "")}`;
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
}
