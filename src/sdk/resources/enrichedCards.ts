import type { BasecampClient } from '../client.js';
import type {
  EnrichedCardContext,
  Attachment,
  Comment,
  BasecampRichTextAttachment,
} from '../../basecamp-types.js';
import fs from 'node:fs';
import path from 'node:path';

export type ImageQuality = 'full' | 'preview' | 'thumbnail';

/**
 * Select the appropriate image URL based on the requested quality level.
 * - 'full' → original download URL (storage.3.basecamp.com)
 * - 'preview' → preview URL (preview.3.basecamp.com) — default, smaller size
 * - 'thumbnail' → card preview URL constructed from download URL, fallback to preview
 */
function getImageUrl(att: Attachment, quality: ImageQuality): string {
  switch (quality) {
    case 'full':
      return att.downloadUrl;
    case 'thumbnail':
      // Try to construct thumbnail URL from download URL
      // Pattern: .../blobs/{key}/download/{filename} → .../blobs/{key}/previews/card
      if (att.downloadUrl.includes('/download/')) {
        return att.downloadUrl.replace(/\/download\/[^/]+$/, '/previews/card');
      }
      // Fallback to preview
      return att.url;
    case 'preview':
    default:
      return att.url;
  }
}

/**
 * Download image from URL using authenticated client and return base64 data
 */
async function downloadImageAsBase64(client: BasecampClient, url: string): Promise<string> {
  return await client.downloadBinary(url);
}

export interface DownloadedAttachment {
  filename: string;
  mimeType: string;
  size: number;
  base64?: string;
  savedPath?: string;
}

/**
 * Download an attachment by URL
 * Always saves to .basecamp/images/ AND returns base64 for image content block.
 * @param client - Basecamp client
 * @param url - Download URL (from attachment.downloadUrl or image.downloadUrl)
 * @param filename - Optional filename to include in response
 * @param mimeType - Optional MIME type (e.g., 'image/png')
 */
export async function downloadAttachment(
  client: BasecampClient,
  url: string,
  filename?: string,
  mimeType?: string
): Promise<DownloadedAttachment> {
  const base64 = await client.downloadBinary(url);

  // Estimate size from base64 (rough approximation)
  const size = Math.ceil((base64.length * 3) / 4);

  const safeFilename = (filename || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');

  // Always save to .basecamp/images/ for backup/reference
  const basecampDir = path.join(process.cwd(), '.basecamp', 'images');
  if (!fs.existsSync(basecampDir)) {
    fs.mkdirSync(basecampDir, { recursive: true });
  }

  const filePath = path.join(basecampDir, safeFilename);
  const buffer = Buffer.from(base64, 'base64');
  fs.writeFileSync(filePath, buffer);

  // Return both: base64 for image content block + savedPath for reference
  return {
    filename: safeFilename,
    mimeType: mimeType || 'application/octet-stream',
    size,
    base64,
    savedPath: filePath,
  };
}

/**
 * Parse HTML content to extract image attachments
 * @internal - exported for testing
 */
export function parseAttachments(htmlContent: string): Attachment[] {
  const attachments: Attachment[] = [];

  // Match <bc-attachment> custom elements
  const attachmentRegex = /<bc-attachment\s+([^>]+)>/g;
  let match;

  while ((match = attachmentRegex.exec(htmlContent)) !== null) {
    const attrs = match[1];
    if (!attrs) continue;

    // Extract attributes
    const sgidMatch = attrs.match(/sgid="([^"]+)"/);
    const contentTypeMatch = attrs.match(/content-type="([^"]+)"/);
    const urlMatch = attrs.match(/url="([^"]+)"/);
    const hrefMatch = attrs.match(/href="([^"]+)"/);
    const filenameMatch = attrs.match(/filename="([^"]+)"/);
    const filesizeMatch = attrs.match(/filesize="(\d+)"/);
    const widthMatch = attrs.match(/width="(\d+)"/);
    const heightMatch = attrs.match(/height="(\d+)"/);
    const previewableMatch = attrs.match(/previewable="(true|false)"/);
    const presentationMatch = attrs.match(/presentation="([^"]+)"/);

    if (
      sgidMatch?.[1] &&
      contentTypeMatch?.[1] &&
      urlMatch?.[1] &&
      hrefMatch?.[1] &&
      filenameMatch?.[1] &&
      filesizeMatch?.[1]
    ) {
      const attachment: Attachment = {
        sgid: sgidMatch[1],
        contentType: contentTypeMatch[1],
        url: urlMatch[1],
        downloadUrl: hrefMatch[1],
        filename: filenameMatch[1],
        filesize: parseInt(filesizeMatch[1], 10),
        previewable: previewableMatch ? previewableMatch[1] === 'true' : false,
      };

      if (widthMatch?.[1] && heightMatch?.[1]) {
        attachment.width = parseInt(widthMatch[1], 10);
        attachment.height = parseInt(heightMatch[1], 10);
      }

      if (presentationMatch?.[1]) {
        attachment.presentation = presentationMatch[1];
      }

      attachments.push(attachment);
    }
  }

  return attachments;
}

interface CardApiResponse {
  id: number;
  title: string;
  description?: string;
  content?: string;
  description_attachments?: BasecampRichTextAttachment[];
  content_attachments?: BasecampRichTextAttachment[];
  status: string;
  created_at: string;
  updated_at: string;
  creator: EnrichedCardContext['card']['creator'];
  steps?: EnrichedCardContext['card']['steps'];
  assignees?: EnrichedCardContext['card']['assignees'];
  due_on?: string;
  bucket: EnrichedCardContext['card']['project'];
  parent: {
    id: number;
    title: string;
  };
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  return values.find(value => value !== undefined && value.length > 0);
}

function toNumber(value: number | string | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toBoolean(value: boolean | string | undefined): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function filenameFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop();
    return filename ? decodeURIComponent(filename) : undefined;
  } catch {
    const filename = url.split('/').pop();
    return filename && filename.length > 0 ? filename : undefined;
  }
}

function structuredAttachmentKey(attachment: BasecampRichTextAttachment): string | undefined {
  return firstNonEmpty(
    attachment.attachable_sgid,
    attachment.sgid,
    attachment.download_url,
    attachment.url,
    attachment.filename
  );
}

function findHtmlAttachmentIndex(
  htmlAttachments: Attachment[],
  structuredAttachment: BasecampRichTextAttachment,
  usedIndexes: Set<number>
): number {
  const sgid = firstNonEmpty(structuredAttachment.attachable_sgid, structuredAttachment.sgid);

  return htmlAttachments.findIndex((attachment, index) => {
    if (usedIndexes.has(index)) return false;
    if (sgid && attachment.sgid === sgid) return true;
    return (
      !!structuredAttachment.filename &&
      attachment.filename === structuredAttachment.filename &&
      (!structuredAttachment.content_type ||
        attachment.contentType === structuredAttachment.content_type)
    );
  });
}

function toAttachment(
  structuredAttachment: BasecampRichTextAttachment,
  htmlAttachment?: Attachment
): Attachment | undefined {
  const downloadUrl = firstNonEmpty(
    structuredAttachment.download_url,
    htmlAttachment?.downloadUrl,
    structuredAttachment.url,
    structuredAttachment.app_url
  );
  const url = firstNonEmpty(
    structuredAttachment.preview_url,
    structuredAttachment.thumbnail_url,
    structuredAttachment.url,
    htmlAttachment?.url,
    downloadUrl
  );

  if (!downloadUrl || !url) return undefined;

  const filename =
    firstNonEmpty(
      structuredAttachment.filename,
      htmlAttachment?.filename,
      filenameFromUrl(downloadUrl),
      filenameFromUrl(url)
    ) ?? 'attachment';
  const filesize =
    toNumber(structuredAttachment.filesize) ??
    toNumber(structuredAttachment.byte_size) ??
    htmlAttachment?.filesize ??
    0;
  const contentType =
    firstNonEmpty(structuredAttachment.content_type, htmlAttachment?.contentType) ??
    'application/octet-stream';
  const attachment: Attachment = {
    sgid:
      firstNonEmpty(
        structuredAttachment.attachable_sgid,
        structuredAttachment.sgid,
        htmlAttachment?.sgid
      ) ?? filename,
    contentType,
    url,
    downloadUrl,
    filename,
    filesize,
    previewable:
      toBoolean(structuredAttachment.previewable) ??
      htmlAttachment?.previewable ??
      !!firstNonEmpty(structuredAttachment.preview_url, structuredAttachment.thumbnail_url),
  };

  const width = toNumber(structuredAttachment.width) ?? htmlAttachment?.width;
  const height = toNumber(structuredAttachment.height) ?? htmlAttachment?.height;
  if (width !== undefined && height !== undefined) {
    attachment.width = width;
    attachment.height = height;
  }

  if (htmlAttachment?.presentation) {
    attachment.presentation = htmlAttachment.presentation;
  }

  return attachment;
}

function collectStructuredAttachments(
  ...attachmentGroups: Array<BasecampRichTextAttachment[] | undefined>
): BasecampRichTextAttachment[] {
  const attachments: BasecampRichTextAttachment[] = [];
  const seenKeys = new Set<string>();

  for (const group of attachmentGroups) {
    if (!group) continue;

    for (const attachment of group) {
      const key = structuredAttachmentKey(attachment);
      if (key) {
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
      }
      attachments.push(attachment);
    }
  }

  return attachments;
}

function parseRichTextAttachments(
  htmlContent: string,
  structuredAttachments: BasecampRichTextAttachment[] = []
): Attachment[] {
  const htmlAttachments = parseAttachments(htmlContent);
  if (structuredAttachments.length === 0) return htmlAttachments;

  const usedHtmlIndexes = new Set<number>();
  const mergedAttachments: Attachment[] = [];

  for (const structuredAttachment of structuredAttachments) {
    const htmlIndex = findHtmlAttachmentIndex(
      htmlAttachments,
      structuredAttachment,
      usedHtmlIndexes
    );
    const htmlAttachment = htmlIndex >= 0 ? htmlAttachments[htmlIndex] : undefined;
    const attachment = toAttachment(structuredAttachment, htmlAttachment);

    if (attachment) {
      mergedAttachments.push(attachment);
      if (htmlIndex >= 0) usedHtmlIndexes.add(htmlIndex);
    }
  }

  htmlAttachments.forEach((attachment, index) => {
    if (!usedHtmlIndexes.has(index)) mergedAttachments.push(attachment);
  });

  return mergedAttachments;
}

/**
 * Get enriched card context with comments and visual attachments
 * @param downloadImages - Whether to download images as base64 (default: false)
 */
export async function getEnrichedCard(
  client: BasecampClient,
  projectId: number,
  cardId: number,
  options: { downloadImages?: boolean; imageQuality?: ImageQuality } = {}
): Promise<EnrichedCardContext> {
  // Fetch card details
  const cardResponse = await client.request(
    'GET',
    `/buckets/${projectId}/card_tables/cards/${cardId}.json`
  );
  const card = cardResponse as CardApiResponse;

  // Fetch all comments (with pagination support)
  const comments = await client.getAllPages<Comment>(
    `/buckets/${projectId}/recordings/${cardId}/comments.json`
  );

  // Parse attachments from card description
  const cardDescription = card.description || card.content || '';
  const cardAttachments = parseRichTextAttachments(
    cardDescription,
    collectStructuredAttachments(card.description_attachments, card.content_attachments)
  );

  // Parse comments and extract attachments
  const enrichedComments = comments.map(comment => {
    const attachments = parseRichTextAttachments(comment.content, comment.content_attachments);
    return {
      id: comment.id,
      creator: comment.creator,
      created_at: comment.created_at,
      content: comment.content,
      attachments,
    };
  });

  // Extract images from card description
  const cardImagePromises = cardAttachments
    .filter(att => att.contentType.startsWith('image/'))
    .map(async att => {
      const img: EnrichedCardContext['images'][0] = {
        url: att.url,
        source: 'card' as const,
        sourceId: card.id,
        creator: card.creator.name,
        metadata: {
          filename: att.filename,
          size: att.filesize,
        },
        mimeType: att.contentType,
        downloadUrl: att.downloadUrl,
      };

      if (att.width && att.height) {
        img.metadata.dimensions = { width: att.width, height: att.height };
      }

      // Download image if requested
      if (options.downloadImages) {
        try {
          const imageUrl = getImageUrl(att, options.imageQuality ?? 'preview');
          img.base64 = await downloadImageAsBase64(client, imageUrl);
        } catch (error) {
          console.error(`Failed to download image ${att.filename}:`, error);
        }
      }

      return img;
    });

  // Extract all images from comments
  const commentImagePromises = enrichedComments.flatMap(comment =>
    comment.attachments
      .filter(att => att.contentType.startsWith('image/'))
      .map(async att => {
        const img: EnrichedCardContext['images'][0] = {
          url: att.url,
          source: 'comment' as const,
          sourceId: comment.id,
          creator: comment.creator.name,
          metadata: {
            filename: att.filename,
            size: att.filesize,
          },
          mimeType: att.contentType,
          downloadUrl: att.downloadUrl,
        };

        if (att.width && att.height) {
          img.metadata.dimensions = { width: att.width, height: att.height };
        }

        // Download image if requested
        if (options.downloadImages) {
          try {
            const imageUrl = getImageUrl(att, options.imageQuality ?? 'preview');
            img.base64 = await downloadImageAsBase64(client, imageUrl);
          } catch (error) {
            console.error(`Failed to download image ${att.filename}:`, error);
          }
        }

        return img;
      })
  );

  const images = await Promise.all([...cardImagePromises, ...commentImagePromises]);

  const cardContext: EnrichedCardContext['card'] = {
    id: card.id,
    title: card.title,
    description: cardDescription,
    status: card.status,
    created_at: card.created_at,
    updated_at: card.updated_at,
    creator: card.creator,
    steps: card.steps || [],
    assignees: card.assignees || [],
    project: {
      id: card.bucket.id,
      name: card.bucket.name,
    },
    column: {
      id: card.parent.id,
      name: card.parent.title,
    },
  };

  if (card.due_on) {
    cardContext.due_on = card.due_on;
  }

  // Build enriched context
  const enrichedContext: EnrichedCardContext = {
    card: cardContext,
    comments: enrichedComments,
    images,
  };

  return enrichedContext;
}

/**
 * Format enriched card context for LLM consumption (text-only)
 */
export function formatEnrichedCardAsText(context: EnrichedCardContext): string {
  let output = '';

  // Card header
  output += `# Card: ${context.card.title}\n\n`;
  output += `**Project:** ${context.card.project.name}\n`;
  output += `**Column:** ${context.card.column.name}\n`;
  output += `**Status:** ${context.card.status}\n`;
  output += `**Created:** ${context.card.created_at}\n`;
  output += `**Creator:** ${context.card.creator.name} (${context.card.creator.email_address})\n\n`;

  // Description
  if (context.card.description) {
    output += `## Description\n\n${context.card.description}\n\n`;
  }

  // Steps
  if (context.card.steps.length > 0) {
    output += `## Steps (${context.card.steps.length})\n\n`;
    context.card.steps.forEach((step, idx) => {
      const status = step.completed ? '✅' : '⬜';
      output += `${idx + 1}. ${status} ${step.title}\n`;
      if (step.assignees && step.assignees.length > 0) {
        output += `   Assigned to: ${step.assignees.map(a => a.name).join(', ')}\n`;
      }
      if (step.due_on) {
        output += `   Due: ${step.due_on}\n`;
      }
    });
    output += '\n';
  }

  // Comments
  if (context.comments.length > 0) {
    output += `## Comments (${context.comments.length})\n\n`;
    context.comments.forEach((comment, idx) => {
      output += `### Comment ${idx + 1} - ${comment.creator.name}\n`;
      output += `**Posted:** ${comment.created_at}\n\n`;

      // Strip HTML tags for text-only content
      const textContent = comment.content.replace(/<[^>]*>/g, '').trim();
      if (textContent) {
        output += `${textContent}\n\n`;
      }

      // List attachments
      if (comment.attachments.length > 0) {
        output += `**Attachments (${comment.attachments.length}):**\n`;
        comment.attachments.forEach(att => {
          output += `- ${att.filename} (${att.contentType}, ${(att.filesize / 1024).toFixed(1)}KB)\n`;
          if (att.width && att.height) {
            output += `  Size: ${att.width}x${att.height}px\n`;
          }
          output += `  Preview: ${att.url}\n`;
          output += `  Download: ${att.downloadUrl}\n`;
        });
        output += '\n';
      }
    });
  }

  // Summary of images
  if (context.images.length > 0) {
    output += `## Image Attachments Summary\n\n`;
    output += `Total images: ${context.images.length}\n\n`;
    context.images.forEach((img, idx) => {
      output += `${idx + 1}. **${img.metadata.filename}**\n`;
      output += `   From: ${img.source} by ${img.creator}\n`;
      if (img.metadata.dimensions) {
        output += `   Size: ${img.metadata.dimensions.width}x${img.metadata.dimensions.height}px\n`;
      }
      output += `   URL: ${img.url}\n\n`;
    });
  }

  return output;
}
