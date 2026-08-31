import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { BasecampAuth, type TokenCache, type TokenResponse } from '../auth';

const originalFetch = global.fetch;

function tokenResponse(overrides: Partial<TokenResponse> = {}): Response {
  const body: TokenResponse = {
    access_token: 'new-access-token',
    expires_in: 3600,
    token_type: 'Bearer',
    ...overrides,
  };
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

function errorResponse(status: number, body: string): Response {
  return {
    ok: false,
    status,
    text: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

async function availablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = http.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Expected a TCP listener address'));
        return;
      }
      server.close(error => (error ? reject(error) : resolve(address.port)));
    });
  });
}

async function callbackRequest(url: string): Promise<{ status: number; body: string }> {
  return await new Promise((resolve, reject) => {
    const request = http.get(url, response => {
      response.setEncoding('utf8');
      let body = '';
      response.on('data', chunk => {
        body += String(chunk);
      });
      response.on('end', () => resolve({ status: response.statusCode ?? 0, body }));
    });
    request.on('error', reject);
  });
}

async function waitForAuthorizationUrl(logSpy: jest.SpyInstance): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const url = logSpy.mock.calls
      .flat()
      .find(value => typeof value === 'string' && value.includes('/authorization/new?'));
    if (typeof url === 'string') return url;
    await new Promise<void>(resolve => setImmediate(resolve));
  }
  throw new Error('Authorization URL was not logged');
}

describe('BasecampAuth security and refresh behavior', () => {
  let temporaryDirectory: string;
  let tokenPath: string;

  beforeEach(async () => {
    temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'basecamp-auth-test-'));
    tokenPath = path.join(temporaryDirectory, 'token.json');
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  });

  function createAuth(redirectUri: string): BasecampAuth {
    return new BasecampAuth({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri,
      userAgent: 'Test App (test@example.com)',
      tokenPath,
    });
  }

  async function writeExpiredToken(refreshToken = 'old-refresh-token'): Promise<void> {
    const cached: TokenCache = {
      access_token: 'expired-access-token',
      expires_in: 3600,
      expires_at: Date.now() - 60_000,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      account_id: '12345',
    };
    await fs.writeFile(tokenPath, JSON.stringify(cached), 'utf8');
  }

  it('requires and validates a random OAuth state on the loopback callback', async () => {
    const port = await availablePort();
    const redirectUri = `http://127.0.0.1:${port}/callback`;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    global.fetch = jest.fn().mockResolvedValue(tokenResponse()) as unknown as typeof fetch;
    const auth = createAuth(redirectUri);

    const tokenPromise = auth.getAccessToken();
    const authorizationUrl = new URL(await waitForAuthorizationUrl(logSpy));
    const state = authorizationUrl.searchParams.get('state');
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(redirectUri);
    await new Promise(resolve => setTimeout(resolve, 20));

    await expect(callbackRequest(`${redirectUri}?code=missing-state`)).resolves.toEqual({
      status: 400,
      body: 'Invalid OAuth state',
    });
    await expect(callbackRequest(`${redirectUri}?code=wrong-state&state=wrong`)).resolves.toEqual({
      status: 400,
      body: 'Invalid OAuth state',
    });
    await expect(
      callbackRequest(`${redirectUri}?code=valid-code&state=${encodeURIComponent(state ?? '')}`)
    ).resolves.toMatchObject({ status: 200 });

    await expect(tokenPromise).resolves.toMatchObject({ access_token: 'new-access-token' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('generates a distinct cryptographically sized state for every authorization attempt', async () => {
    const auth = createAuth('http://127.0.0.1:8787/callback');
    const callbackSpy = jest
      .spyOn(
        auth as unknown as {
          startLocalCallbackServer(state: string): Promise<{ code: string }>;
        },
        'startLocalCallbackServer'
      )
      .mockResolvedValue({ code: 'authorization-code' });
    const authorize = (
      auth as unknown as { oauthAuthorize(openBrowserFlag: boolean): Promise<string> }
    ).oauthAuthorize.bind(auth);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await authorize(false);
    await authorize(false);

    const states = callbackSpy.mock.calls.map(([state]) => state);
    expect(states).toHaveLength(2);
    expect(states[0]).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(states[1]).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(states[0]).not.toBe(states[1]);
  });

  it('rejects non-loopback OAuth callback hosts before binding a listener', async () => {
    const auth = createAuth('http://example.com:8787/callback');

    await expect(auth.getAccessToken()).rejects.toThrow(
      'callback host must be localhost, 127.0.0.1, or ::1'
    );
    expect(global.fetch).toBe(originalFetch);
  });

  it('falls back to a fresh authorization when refresh fails', async () => {
    await writeExpiredToken();
    const auth = createAuth('http://127.0.0.1:8787/callback');
    const authorizeSpy = jest
      .spyOn(
        auth as unknown as { oauthAuthorize(openBrowserFlag: boolean): Promise<string> },
        'oauthAuthorize'
      )
      .mockResolvedValue('fresh-code');
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(errorResponse(401, 'invalid refresh token'))
      .mockResolvedValueOnce(
        tokenResponse({ refresh_token: 'fresh-refresh-token' })
      ) as unknown as typeof fetch;

    await expect(auth.getAccessToken({ openBrowser: true })).resolves.toMatchObject({
      access_token: 'new-access-token',
      refresh_token: 'fresh-refresh-token',
    });
    expect(authorizeSpy).toHaveBeenCalledWith(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('preserves the previous refresh token when refresh omits a replacement', async () => {
    await writeExpiredToken('preserved-refresh-token');
    global.fetch = jest.fn().mockResolvedValue(tokenResponse()) as unknown as typeof fetch;
    const auth = createAuth('http://127.0.0.1:8787/callback');

    const token = await auth.getAccessToken();

    expect(token.refresh_token).toBe('preserved-refresh-token');
    const persisted = JSON.parse(await fs.readFile(tokenPath, 'utf8')) as TokenCache;
    expect(persisted.refresh_token).toBe('preserved-refresh-token');
  });

  it('keeps silent auto-auth non-interactive when refresh fails', async () => {
    await writeExpiredToken();
    global.fetch = jest
      .fn()
      .mockResolvedValue(errorResponse(401, 'invalid refresh token')) as unknown as typeof fetch;
    const auth = createAuth('http://127.0.0.1:8787/callback');

    await expect(auth.tryAutoAuth()).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
