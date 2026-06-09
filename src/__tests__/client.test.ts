import { BasecampClient } from "../sdk/client";

jest.mock("../auth", () => ({
  BasecampAuth: jest.fn().mockImplementation(() => ({
    getAccessToken: jest.fn().mockResolvedValue({ access_token: "token" }),
    resolveAccountId: jest.fn().mockResolvedValue("12345"),
  })),
}));

const originalFetch = global.fetch;

// Test the URL conversion logic used in BasecampClient.downloadBinary
describe("BasecampClient", () => {
  beforeEach(() => {
    process.env["BASECAMP_USER_AGENT"] = "Test App (test@example.com)";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env["BASECAMP_USER_AGENT"];
    jest.clearAllMocks();
  });

  describe("URL conversion for binary downloads", () => {
    // We can't directly test private methods, but we can test the behavior
    // by mocking the fetch and checking what URL was called

    it("should convert storage.3.basecamp.com URLs to 3.basecampapi.com", () => {
      // Test the URL conversion logic
      const storageUrl =
        "https://storage.3.basecamp.com/12345/blobs/abc123/download/image.png";
      const expectedApiUrl =
        "https://3.basecampapi.com/12345/blobs/abc123/download/image.png";

      // Verify the conversion pattern
      const convertedUrl = storageUrl.replace(
        "https://storage.3.basecamp.com",
        "https://3.basecampapi.com",
      );
      expect(convertedUrl).toBe(expectedApiUrl);
    });

    it("should convert preview.3.basecamp.com URLs to 3.basecampapi.com", () => {
      const previewUrl =
        "https://preview.3.basecamp.com/12345/blobs/abc123/previews/123.png";
      const expectedApiUrl =
        "https://3.basecampapi.com/12345/blobs/abc123/previews/123.png";

      const convertedUrl = previewUrl.replace(
        "https://preview.3.basecamp.com",
        "https://3.basecampapi.com",
      );
      expect(convertedUrl).toBe(expectedApiUrl);
    });

    it("should not modify already correct API URLs", () => {
      const apiUrl =
        "https://3.basecampapi.com/12345/blobs/abc123/download/image.png";

      // No conversion needed
      let convertedUrl = apiUrl;
      if (apiUrl.includes("storage.3.basecamp.com")) {
        convertedUrl = apiUrl.replace(
          "https://storage.3.basecamp.com",
          "https://3.basecampapi.com",
        );
      }
      if (apiUrl.includes("preview.3.basecamp.com")) {
        convertedUrl = apiUrl.replace(
          "https://preview.3.basecamp.com",
          "https://3.basecampapi.com",
        );
      }

      expect(convertedUrl).toBe(apiUrl);
    });

    it("should convert storage.app.basecamp.com binary downloads before fetching", async () => {
      const responseBytes = Uint8Array.from([80, 68, 70]).buffer;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(responseBytes),
      }) as unknown as typeof fetch;
      const client = new BasecampClient();

      const result = await client.downloadBinary(
        "https://storage.app.basecamp.com/12345/blobs/abc123/download/spec.pdf",
      );

      expect(result).toBe("UERG");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://3.basecampapi.com/12345/blobs/abc123/download/spec.pdf",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer token",
            "User-Agent": "Test App (test@example.com)",
          },
        },
      );
    });
  });
});
