import {
  parseAttachments,
  formatEnrichedCardAsText,
  downloadAttachment,
} from '../../src/sdk/resources/enrichedCards';
import type { EnrichedCardContext } from '../../src/basecamp-types';

describe('Enriched Cards', () => {
  describe('parseAttachments', () => {
    it('should parse image attachment from HTML content', () => {
      const htmlContent = `<div><bc-attachment sgid="BAh7test123" content-type="image/png" url="https://preview.example.com/image.png" href="https://storage.example.com/download/image.png" filename="screenshot.png" filesize="24840" width="534" height="295" previewable="true" presentation="gallery"><figure>
    <img src="https://preview.example.com/image.png">
  </figure></bc-attachment></div>`;

      const attachments = (parseAttachments as any)(htmlContent);

      expect(attachments).toHaveLength(1);
      expect(attachments[0]).toMatchObject({
        sgid: 'BAh7test123',
        contentType: 'image/png',
        url: 'https://preview.example.com/image.png',
        downloadUrl: 'https://storage.example.com/download/image.png',
        filename: 'screenshot.png',
        filesize: 24840,
        width: 534,
        height: 295,
        previewable: true,
        presentation: 'gallery',
      });
    });

    it('should parse multiple attachments', () => {
      const htmlContent = `
        <bc-attachment sgid="test1" content-type="image/png" url="url1" href="href1" filename="file1.png" filesize="1000" previewable="true"></bc-attachment>
        <bc-attachment sgid="test2" content-type="application/pdf" url="url2" href="href2" filename="file2.pdf" filesize="2000" previewable="false"></bc-attachment>
      `;

      const attachments = (parseAttachments as any)(htmlContent);

      expect(attachments).toHaveLength(2);
      expect(attachments[0].filename).toBe('file1.png');
      expect(attachments[1].filename).toBe('file2.pdf');
    });

    it('should handle attachments without dimensions', () => {
      const htmlContent = `<bc-attachment sgid="test" content-type="application/pdf" url="url" href="href" filename="doc.pdf" filesize="5000" previewable="false"></bc-attachment>`;

      const attachments = (parseAttachments as any)(htmlContent);

      expect(attachments).toHaveLength(1);
      expect(attachments[0].width).toBeUndefined();
      expect(attachments[0].height).toBeUndefined();
    });

    it('should parse attachments from card description (not just comments)', () => {
      // Real-world example from Basecamp card description
      const cardDescription = `<div><bc-attachment sgid="BAh7cardtest" content-type="image/png" url="https://preview.3.basecamp.com/preview.png" href="https://storage.3.basecamp.com/download/image.png" filename="card-screenshot.png" filesize="23635" width="359" height="279" previewable="true" presentation="gallery"><figure>
    <img src="https://preview.3.basecamp.com/preview.png">
  </figure></bc-attachment></div>`;

      const attachments = (parseAttachments as any)(cardDescription);

      expect(attachments).toHaveLength(1);
      expect(attachments[0]).toMatchObject({
        sgid: 'BAh7cardtest',
        contentType: 'image/png',
        filename: 'card-screenshot.png',
        filesize: 23635,
        width: 359,
        height: 279,
      });
    });
  });

  describe('downloadAttachment', () => {
    it('should return DownloadedAttachment structure', async () => {
      // Mock client
      const mockClient = {
        downloadBinary: jest.fn().mockResolvedValue('SGVsbG8gV29ybGQ='), // "Hello World" in base64
      };

      const result = await downloadAttachment(
        mockClient as any,
        'https://example.com/image.png',
        'test.png',
        'image/png'
      );

      expect(result).toMatchObject({
        filename: 'test.png',
        mimeType: 'image/png',
        base64: 'SGVsbG8gV29ybGQ=',
      });
      expect(result.size).toBeGreaterThan(0);
      expect(mockClient.downloadBinary).toHaveBeenCalledWith('https://example.com/image.png');
    });

    it('should use default values when optional params not provided', async () => {
      const mockClient = {
        downloadBinary: jest.fn().mockResolvedValue('dGVzdA=='),
      };

      const result = await downloadAttachment(mockClient as any, 'https://example.com/file');

      expect(result.filename).toBe('attachment');
      expect(result.mimeType).toBe('application/octet-stream');
    });
  });

  describe('formatEnrichedCardAsText', () => {
    it('should format enriched card context as readable text', () => {
      const mockContext: EnrichedCardContext = {
        card: {
          id: 123,
          title: 'Test Card',
          description: 'Test description',
          status: 'active',
          created_at: '2025-11-20T10:00:00Z',
          updated_at: '2025-11-20T11:00:00Z',
          creator: {
            id: 1,
            name: 'John Doe',
            email_address: 'john@example.com',
          } as any,
          steps: [
            {
              id: 1,
              title: 'Step 1',
              completed: true,
              assignees: [],
            } as any,
            {
              id: 2,
              title: 'Step 2',
              completed: false,
              assignees: [{ id: 1, name: 'Jane' } as any],
              due_on: '2025-11-25',
            } as any,
          ],
          assignees: [],
          project: { id: 1, name: 'Project A' },
          column: { id: 1, name: 'To Do' },
        },
        comments: [
          {
            id: 1,
            creator: { id: 2, name: 'Alice' } as any,
            created_at: '2025-11-20T12:00:00Z',
            content: '<div>Great work!</div>',
            attachments: [],
          },
        ],
        images: [
          {
            url: 'https://example.com/image.png',
            downloadUrl: 'https://example.com/download/image.png',
            source: 'comment',
            sourceId: 1,
            creator: 'Alice',
            metadata: {
              filename: 'screenshot.png',
              size: 24840,
              dimensions: { width: 800, height: 600 },
            },
          },
        ],
      };

      const text = formatEnrichedCardAsText(mockContext);

      expect(text).toContain('# Card: Test Card');
      expect(text).toContain('**Project:** Project A');
      expect(text).toContain('**Column:** To Do');
      expect(text).toContain('## Description');
      expect(text).toContain('Test description');
      expect(text).toContain('## Steps (2)');
      expect(text).toContain('✅ Step 1');
      expect(text).toContain('⬜ Step 2');
      expect(text).toContain('Assigned to: Jane');
      expect(text).toContain('Due: 2025-11-25');
      expect(text).toContain('## Comments (1)');
      expect(text).toContain('Alice');
      expect(text).toContain('## Image Attachments Summary');
      expect(text).toContain('screenshot.png');
      expect(text).toContain('800x600px');
    });

    it('should handle card without steps or comments', () => {
      const mockContext: EnrichedCardContext = {
        card: {
          id: 123,
          title: 'Simple Card',
          description: '',
          status: 'active',
          created_at: '2025-11-20T10:00:00Z',
          updated_at: '2025-11-20T11:00:00Z',
          creator: { id: 1, name: 'John' } as any,
          steps: [],
          assignees: [],
          project: { id: 1, name: 'Project' },
          column: { id: 1, name: 'Column' },
        },
        comments: [],
        images: [],
      };

      const text = formatEnrichedCardAsText(mockContext);

      expect(text).toContain('# Card: Simple Card');
      expect(text).not.toContain('## Steps');
      expect(text).not.toContain('## Comments');
      expect(text).not.toContain('## Image Attachments Summary');
    });

    it('should include images from card description (source: card)', () => {
      const mockContext: EnrichedCardContext = {
        card: {
          id: 456,
          title: 'Card With Image',
          description: '<div>Some description with image</div>',
          status: 'active',
          created_at: '2025-11-20T10:00:00Z',
          updated_at: '2025-11-20T11:00:00Z',
          creator: { id: 1, name: 'John' } as any,
          steps: [],
          assignees: [],
          project: { id: 1, name: 'Project' },
          column: { id: 1, name: 'Column' },
        },
        comments: [],
        images: [
          {
            url: 'https://example.com/card-image.png',
            downloadUrl: 'https://example.com/download/card-image.png',
            source: 'card',
            sourceId: 456,
            creator: 'John',
            metadata: {
              filename: 'card-image.png',
              size: 12345,
              dimensions: { width: 400, height: 300 },
            },
          },
        ],
      };

      const text = formatEnrichedCardAsText(mockContext);

      expect(text).toContain('## Image Attachments Summary');
      expect(text).toContain('card-image.png');
      expect(text).toContain('From: card by John');
      expect(text).toContain('400x300px');
    });
  });
});
