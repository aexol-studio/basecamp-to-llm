import type { BasecampClient } from "../client.js";
import type {
  EnrichedCardContext,
  Attachment,
  Comment,
} from "../../basecamp-types.js";
import fs from "node:fs";
import path from "node:path";

export type ImageQuality = "full" | "preview" | "thumbnail";

/**
 * Select the appropriate image URL based on the requested quality level.
 * - 'full' → original download URL (storage.3.basecamp.com)
 * - 'preview' → preview URL (preview.3.basecamp.com) — default, smaller size
 * - 'thumbnail' → card preview URL constructed from download URL, fallback to preview
 */
function getImageUrl(att: Attachment, quality: ImageQuality): string {
  switch (quality) {
    case "full":
      return att.downloadUrl;
    case "thumbnail":
      // Try to construct thumbnail URL from download URL
      // Pattern: .../blobs/{key}/download/{filename} → .../blobs/{key}/previews/card
      if (att.downloadUrl.includes("/download/")) {
        return att.downloadUrl.replace(/\/download\/[^/]+$/, "/previews/card");
      }
      // Fallback to preview
      return att.url;
    case "preview":
    default:
      return att.url;
  }
}

/**
 * Download image from URL using authenticated client and return base64 data
 */
async function downloadImageAsBase64(
  client: BasecampClient,
  url: string,
): Promise<string> {
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
  mimeType?: string,
): Promise<DownloadedAttachment> {
  const base64 = await client.downloadBinary(url);

  // Estimate size from base64 (rough approximation)
  const size = Math.ceil((base64.length * 3) / 4);

  const safeFilename = (filename || "attachment").replace(
    /[^a-zA-Z0-9._-]/g,
    "_",
  );

  // Always save to .basecamp/images/ for backup/reference
  const basecampDir = path.join(process.cwd(), ".basecamp", "images");
  if (!fs.existsSync(basecampDir)) {
    fs.mkdirSync(basecampDir, { recursive: true });
  }

  const filePath = path.join(basecampDir, safeFilename);
  const buffer = Buffer.from(base64, "base64");
  fs.writeFileSync(filePath, buffer);

  // Return both: base64 for image content block + savedPath for reference
  return {
    filename: safeFilename,
    mimeType: mimeType || "application/octet-stream",
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
        previewable: previewableMatch ? previewableMatch[1] === "true" : false,
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

/**
 * Get enriched card context with comments and visual attachments
 * @param downloadImages - Whether to download images as base64 (default: false)
 */
export async function getEnrichedCard(
  client: BasecampClient,
  projectId: number,
  cardId: number,
  options: { downloadImages?: boolean; imageQuality?: ImageQuality } = {},
): Promise<EnrichedCardContext> {
  // Fetch card details
  const cardResponse = await client.request(
    "GET",
    `/buckets/${projectId}/card_tables/cards/${cardId}.json`,
  );
  const card = cardResponse as any;

  // Fetch all comments (with pagination support)
  const comments = await client.getAllPages<Comment>(
    `/buckets/${projectId}/recordings/${cardId}/comments.json`,
  );

  // Parse attachments from card description
  const cardDescription = card.description || card.content || "";
  const cardAttachments = parseAttachments(cardDescription);

  // Parse comments and extract attachments
  const enrichedComments = comments.map((comment) => {
    const attachments = parseAttachments(comment.content);
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
    .filter((att) => att.contentType.startsWith("image/"))
    .map(async (att) => {
      const img: EnrichedCardContext["images"][0] = {
        url: att.url,
        source: "card" as const,
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
          const imageUrl = getImageUrl(att, options.imageQuality ?? "preview");
          img.base64 = await downloadImageAsBase64(client, imageUrl);
        } catch (error) {
          console.error(`Failed to download image ${att.filename}:`, error);
        }
      }

      return img;
    });

  // Extract all images from comments
  const commentImagePromises = enrichedComments.flatMap((comment) =>
    comment.attachments
      .filter((att) => att.contentType.startsWith("image/"))
      .map(async (att) => {
        const img: EnrichedCardContext["images"][0] = {
          url: att.url,
          source: "comment" as const,
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
            const imageUrl = getImageUrl(
              att,
              options.imageQuality ?? "preview",
            );
            img.base64 = await downloadImageAsBase64(client, imageUrl);
          } catch (error) {
            console.error(`Failed to download image ${att.filename}:`, error);
          }
        }

        return img;
      }),
  );

  const images = await Promise.all([
    ...cardImagePromises,
    ...commentImagePromises,
  ]);

  // Build enriched context
  const enrichedContext: EnrichedCardContext = {
    card: {
      id: card.id,
      title: card.title,
      description: card.description || card.content || "",
      status: card.status,
      created_at: card.created_at,
      updated_at: card.updated_at,
      creator: card.creator,
      steps: card.steps || [],
      assignees: card.assignees || [],
      due_on: card.due_on,
      project: {
        id: card.bucket.id,
        name: card.bucket.name,
      },
      column: {
        id: card.parent.id,
        name: card.parent.title,
      },
    },
    comments: enrichedComments,
    images,
  };

  return enrichedContext;
}

/**
 * Format enriched card context for LLM consumption (text-only)
 */
export function formatEnrichedCardAsText(context: EnrichedCardContext): string {
  let output = "";

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
      const status = step.completed ? "✅" : "⬜";
      output += `${idx + 1}. ${status} ${step.title}\n`;
      if (step.assignees && step.assignees.length > 0) {
        output += `   Assigned to: ${step.assignees.map((a) => a.name).join(", ")}\n`;
      }
      if (step.due_on) {
        output += `   Due: ${step.due_on}\n`;
      }
    });
    output += "\n";
  }

  // Comments
  if (context.comments.length > 0) {
    output += `## Comments (${context.comments.length})\n\n`;
    context.comments.forEach((comment, idx) => {
      output += `### Comment ${idx + 1} - ${comment.creator.name}\n`;
      output += `**Posted:** ${comment.created_at}\n\n`;

      // Strip HTML tags for text-only content
      const textContent = comment.content.replace(/<[^>]*>/g, "").trim();
      if (textContent) {
        output += `${textContent}\n\n`;
      }

      // List attachments
      if (comment.attachments.length > 0) {
        output += `**Attachments (${comment.attachments.length}):**\n`;
        comment.attachments.forEach((att) => {
          output += `- ${att.filename} (${att.contentType}, ${(att.filesize / 1024).toFixed(1)}KB)\n`;
          if (att.width && att.height) {
            output += `  Size: ${att.width}x${att.height}px\n`;
          }
          output += `  Preview: ${att.url}\n`;
          output += `  Download: ${att.downloadUrl}\n`;
        });
        output += "\n";
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
