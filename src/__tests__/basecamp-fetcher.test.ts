import { BasecampFetcher } from "../basecamp-fetcher";

describe("BasecampFetcher", () => {
  beforeEach(() => {
    // Mock environment variables for testing
    process.env["BASECAMP_USER_AGENT"] = "Test App (test@example.com)";
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env["BASECAMP_USER_AGENT"];
  });

  describe("constructor", () => {
    it("should throw error when BASECAMP_USER_AGENT is not set", () => {
      delete process.env["BASECAMP_USER_AGENT"];
      expect(() => new BasecampFetcher()).toThrow(
        "Missing env BASECAMP_USER_AGENT",
      );
    });

    it("should not throw error when BASECAMP_USER_AGENT is set", () => {
      process.env["BASECAMP_USER_AGENT"] = "Test App (test@example.com)";
      expect(() => new BasecampFetcher()).not.toThrow();
    });
  });

  // Add more tests as needed for other methods
  // Note: Testing OAuth and API calls would require mocking fetch and other external dependencies
});
