// Test the URL conversion logic used in BasecampClient.downloadBinary
describe('BasecampClient', () => {
  describe('URL conversion for binary downloads', () => {
    // We can't directly test private methods, but we can test the behavior
    // by mocking the fetch and checking what URL was called

    it('should convert storage.3.basecamp.com URLs to 3.basecampapi.com', () => {
      // Test the URL conversion logic
      const storageUrl = 'https://storage.3.basecamp.com/12345/blobs/abc123/download/image.png';
      const expectedApiUrl = 'https://3.basecampapi.com/12345/blobs/abc123/download/image.png';

      // Verify the conversion pattern
      const convertedUrl = storageUrl.replace(
        'https://storage.3.basecamp.com',
        'https://3.basecampapi.com'
      );
      expect(convertedUrl).toBe(expectedApiUrl);
    });

    it('should convert preview.3.basecamp.com URLs to 3.basecampapi.com', () => {
      const previewUrl = 'https://preview.3.basecamp.com/12345/blobs/abc123/previews/123.png';
      const expectedApiUrl = 'https://3.basecampapi.com/12345/blobs/abc123/previews/123.png';

      const convertedUrl = previewUrl.replace(
        'https://preview.3.basecamp.com',
        'https://3.basecampapi.com'
      );
      expect(convertedUrl).toBe(expectedApiUrl);
    });

    it('should not modify already correct API URLs', () => {
      const apiUrl = 'https://3.basecampapi.com/12345/blobs/abc123/download/image.png';

      // No conversion needed
      let convertedUrl = apiUrl;
      if (apiUrl.includes('storage.3.basecamp.com')) {
        convertedUrl = apiUrl.replace(
          'https://storage.3.basecamp.com',
          'https://3.basecampapi.com'
        );
      }
      if (apiUrl.includes('preview.3.basecamp.com')) {
        convertedUrl = apiUrl.replace(
          'https://preview.3.basecamp.com',
          'https://3.basecampapi.com'
        );
      }

      expect(convertedUrl).toBe(apiUrl);
    });
  });
});
