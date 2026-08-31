import { BasecampClient } from '../sdk/client';

const mockGetAccessToken = jest.fn();
const mockResolveAccountId = jest.fn();

jest.mock('../auth', () => ({
  BasecampAuth: jest.fn().mockImplementation(() => ({
    getAccessToken: mockGetAccessToken,
    resolveAccountId: mockResolveAccountId,
  })),
}));

const originalFetch = global.fetch;

describe('BasecampClient', () => {
  beforeEach(() => {
    process.env['BASECAMP_USER_AGENT'] = 'Test App (test@example.com)';
    mockGetAccessToken.mockResolvedValue({ access_token: 'token' });
    mockResolveAccountId.mockResolvedValue('12345');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env['BASECAMP_USER_AGENT'];
    jest.clearAllMocks();
  });

  describe('authorized URL allowlist', () => {
    it.each([
      'https://3.basecampapi.com/12345/blobs/abc123/download/spec.pdf',
      'https://storage.3.basecamp.com/12345/blobs/abc123/download/spec.pdf',
      'https://preview.3.basecamp.com/12345/blobs/abc123/download/spec.pdf',
      'https://storage.app.basecamp.com/12345/blobs/abc123/download/spec.pdf',
    ])('downloads from approved Basecamp URL %s', async sourceUrl => {
      const responseBytes = Uint8Array.from([80, 68, 70]).buffer;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(responseBytes),
      }) as unknown as typeof fetch;
      const client = new BasecampClient();

      const result = await client.downloadBinary(sourceUrl);

      expect(result).toBe('UERG');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://3.basecampapi.com/12345/blobs/abc123/download/spec.pdf',
        {
          method: 'GET',
          redirect: 'manual',
          headers: {
            Authorization: 'Bearer token',
            'User-Agent': 'Test App (test@example.com)',
          },
        }
      );
    });

    it('supports relative account API paths', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: jest.fn().mockReturnValue('application/json') },
        json: jest.fn().mockResolvedValue({ id: 1 }),
      }) as unknown as typeof fetch;
      const client = new BasecampClient();

      await expect(client.get('/projects.json')).resolves.toEqual({ id: 1 });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://3.basecampapi.com/12345/projects.json',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer token' }),
        })
      );
    });

    it('allows absolute requests to the Basecamp account API', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: jest.fn().mockReturnValue('application/json') },
        json: jest.fn().mockResolvedValue({ id: 1 }),
      }) as unknown as typeof fetch;
      const client = new BasecampClient();

      await client.request('GET', 'https://3.basecampapi.com/12345/projects.json', {
        absolute: true,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://3.basecampapi.com/12345/projects.json',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer token' }),
        })
      );
    });

    it('safely converts supported storage hosts for absolute requests', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: jest.fn().mockReturnValue('application/json') },
        json: jest.fn().mockResolvedValue({ id: 1 }),
      }) as unknown as typeof fetch;
      const client = new BasecampClient();

      await client.request(
        'GET',
        'https://preview.3.basecamp.com/12345/blobs/abc123/previews/card',
        { absolute: true }
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://3.basecampapi.com/12345/blobs/abc123/previews/card',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer token' }),
        })
      );
    });

    it.each([
      ['HTTP', 'http://3.basecampapi.com/12345/projects.json', 'requires HTTPS'],
      [
        'credentials',
        'https://user:password@3.basecampapi.com/12345/projects.json',
        'credentials in URLs',
      ],
      [
        'lookalike host',
        'https://3.basecampapi.com.attacker.example/12345/projects.json',
        'not an approved Basecamp host',
      ],
      [
        'unrelated host',
        'https://example.com/12345/projects.json',
        'not an approved Basecamp host',
      ],
    ])('rejects %s URLs before retrieving or attaching a token', async (_label, url, message) => {
      const client = new BasecampClient();

      await expect(client.request('GET', url, { absolute: true })).rejects.toThrow(message);
      await expect(client.downloadBinary(url)).rejects.toThrow(message);
      expect(mockGetAccessToken).not.toHaveBeenCalled();
      expect(global.fetch).toBe(originalFetch);
    });
  });

  describe('paginated windows', () => {
    const jsonResponse = (items: number[], nextUrl?: string) => ({
      ok: true,
      headers: {
        get: jest.fn((name: string) => {
          if (name.toLowerCase() === 'content-type') return 'application/json';
          if (name.toLowerCase() === 'link' && nextUrl) {
            return `<${nextUrl}>; rel="next"`;
          }
          return null;
        }),
      },
      json: jest.fn().mockResolvedValue(items),
    });

    it('stops Link traversal after the requested window and one lookahead', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse([1, 2], 'https://3.basecampapi.com/12345/cards.json?page=2')
        )
        .mockResolvedValueOnce(
          jsonResponse([3, 4], 'https://3.basecampapi.com/12345/cards.json?page=3')
        )
        .mockResolvedValueOnce(
          jsonResponse([5, 6], 'https://3.basecampapi.com/12345/cards.json?page=4')
        )
        .mockResolvedValueOnce(jsonResponse([7, 8]));
      const client = new BasecampClient();

      const result = await client.getPageWindow<number>('/cards.json', 2, 2);

      expect(result).toEqual({ items: [3, 4], hasMore: true });
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(global.fetch).not.toHaveBeenCalledWith(
        'https://3.basecampapi.com/12345/cards.json?page=4',
        expect.anything()
      );
    });

    it('keeps getAllPages traversing every Link page', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse([1, 2], 'https://3.basecampapi.com/12345/cards.json?page=2')
        )
        .mockResolvedValueOnce(
          jsonResponse([3, 4], 'https://3.basecampapi.com/12345/cards.json?page=3')
        )
        .mockResolvedValueOnce(jsonResponse([5, 6]));
      const client = new BasecampClient();

      await expect(client.getAllPages<number>('/cards.json')).resolves.toEqual([1, 2, 3, 4, 5, 6]);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('rejects an unapproved next-page Link before forwarding authorization', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse([1, 2], 'https://attacker.example/page-2'));
      const client = new BasecampClient();

      await expect(client.getAllPages<number>('/cards.json')).rejects.toThrow(
        'not an approved Basecamp host'
      );
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
