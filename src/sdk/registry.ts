import { z } from 'zod';
import { BasecampClient } from './client.js';
import { ProjectsResource } from './resources/projects.js';
import { CardTablesResource } from './resources/cardTables.js';
import { PeopleResource } from './resources/people.js';
import { CommentsResource } from './resources/comments.js';
import { StepsResource } from './resources/steps.js';
import { getEnrichedCard, formatEnrichedCardAsText } from './resources/enrichedCards.js';
import type { ImageQuality } from './resources/enrichedCards.js';

export type ActionHandler = (
  client: BasecampClient,
  args: Record<string, unknown>
) => Promise<unknown>;

export interface ActionDef {
  name: string; // e.g. projects.list
  description: string;
  schema: Record<string, unknown>; // JSON schema-like input description (kept for backward compat)
  zodSchema: Record<string, z.ZodTypeAny>; // Zod schema shape for McpServer.registerTool
  handler: ActionHandler;
}

export const apiRequestZodSchema = {
  method: z
    .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'])
    .describe('HTTP method: GET, POST, PUT, PATCH, DELETE, HEAD'),
  path: z
    .string()
    .describe(
      'API path like /projects.json or absolute URL like https://3.basecampapi.com/{account}/projects.json'
    ),
  query: z.record(z.unknown()).optional().describe('Optional query parameters as key/value map'),
  body: z.unknown().optional().describe('Optional JSON body for write methods'),
  absolute: z.boolean().optional().describe('Treat path as absolute URL (default: false)'),
};

export const attachmentDownloadDescription =
  'Download a Basecamp attachment. Always saves it under .basecamp/images/ in the current working directory, overwriting an existing file with the same sanitized name. Images return MCP image content; other files return metadata. Use downloadUrl from enriched card images.';

export const attachmentDownloadZodSchema = {
  url: z.string().describe('Download URL from image.downloadUrl'),
  filename: z
    .string()
    .optional()
    .describe(
      'Filename to save; defaults to attachment and replaces characters outside letters, numbers, dot, underscore, and hyphen with underscores'
    ),
  mimeType: z.string().optional().describe('MIME type (e.g., image/png)'),
};

export const actions: ActionDef[] = [
  // === PROJECTS (read-only) ===
  {
    name: 'projects.list',
    description: 'List projects (optional status=archived|trashed, page)',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['archived', 'trashed'] },
        page: { type: 'integer', minimum: 1 },
      },
    },
    zodSchema: {
      status: z
        .enum(['archived', 'trashed'])
        .optional()
        .describe('Filter by status: archived or trashed'),
      page: z.number().int().min(1).optional().describe('Positive one-based page number'),
    },
    handler: async (client, args) =>
      new ProjectsResource(client).list(
        (args as { status?: 'archived' | 'trashed'; page?: number }) || {}
      ),
  },

  // === CARD TABLES ===
  {
    name: 'card_tables.get',
    description:
      'Get a raw card table (kanban board) and its column metadata by ID. Use card_tables.list_cards to retrieve cards from a column.',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'number' },
        tableId: { type: 'number' },
      },
      required: ['projectId', 'tableId'],
    },
    zodSchema: {
      projectId: z.number().describe('Basecamp project ID'),
      tableId: z.number().describe('Card table (kanban board) ID'),
    },
    handler: async (client, args) =>
      new CardTablesResource(client).get(
        (args as { projectId: number; tableId: number }).projectId,
        (args as { projectId: number; tableId: number }).tableId
      ),
  },
  {
    name: 'card_tables.list_cards',
    description:
      'List a bounded page of cards in a kanban column. Compact output is the default; use detail=extended for raw Basecamp cards.',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'number' },
        columnId: { type: 'number' },
        detail: {
          type: 'string',
          enum: ['compact', 'extended'],
          default: 'compact',
        },
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
      },
      required: ['projectId', 'columnId'],
    },
    zodSchema: {
      projectId: z.number().describe('Basecamp project ID'),
      columnId: z.number().describe('Card table column ID'),
      detail: z
        .enum(['compact', 'extended'])
        .default('compact')
        .describe('Card detail: compact (default) or full raw extended cards'),
      page: z.number().int().min(1).default(1).describe('One-based page number'),
      limit: z.number().int().min(1).max(100).default(25).describe('Cards per page (1-100)'),
    },
    handler: async (client, args) => {
      const {
        projectId,
        columnId,
        detail = 'compact',
        page = 1,
        limit = 25,
      } = args as {
        projectId: number;
        columnId: number;
        detail?: 'compact' | 'extended';
        page?: number;
        limit?: number;
      };
      return new CardTablesResource(client).listCardsPage(projectId, columnId, {
        detail,
        page,
        limit,
      });
    },
  },
  {
    name: 'card_tables.get_card',
    description: 'Get a card by ID with basic info',
    schema: {
      type: 'object',
      properties: { projectId: { type: 'number' }, cardId: { type: 'number' } },
      required: ['projectId', 'cardId'],
    },
    zodSchema: {
      projectId: z.number().describe('Basecamp project ID'),
      cardId: z.number().describe('Card ID'),
    },
    handler: async (client, args) =>
      new CardTablesResource(client).getCard(
        (args as { projectId: number; cardId: number }).projectId,
        (args as { projectId: number; cardId: number }).cardId
      ),
  },
  {
    name: 'card_tables.get_enriched',
    description:
      'Get an enriched card with comments, creator info, and visual attachments. Best for understanding full context of a task.',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'number' },
        cardId: { type: 'number' },
        format: {
          type: 'string',
          enum: ['json', 'text'],
          description: 'Output format: json or text (default: json)',
        },
        downloadImages: {
          type: 'boolean',
          description: 'Whether to download images as base64 (default: false)',
        },
        imageQuality: {
          type: 'string',
          enum: ['full', 'preview', 'thumbnail'],
          description:
            'Image quality: full (original), preview (medium, default), thumbnail (smallest)',
        },
      },
      required: ['projectId', 'cardId'],
    },
    zodSchema: {
      projectId: z.number().describe('Basecamp project ID'),
      cardId: z.number().describe('Card ID'),
      format: z
        .enum(['json', 'text'])
        .optional()
        .describe('Output format: json or text (default: json)'),
      downloadImages: z
        .boolean()
        .optional()
        .describe('Whether to download images as base64 (default: false)'),
      imageQuality: z
        .enum(['full', 'preview', 'thumbnail'])
        .optional()
        .describe(
          'Image quality: full (original), preview (medium, default), thumbnail (smallest)'
        ),
    },
    handler: async (client, args) => {
      const { projectId, cardId, format, downloadImages, imageQuality } = args as {
        projectId: number;
        cardId: number;
        format?: 'json' | 'text';
        downloadImages?: boolean;
        imageQuality?: ImageQuality;
      };
      const enriched = await getEnrichedCard(client, projectId, cardId, {
        ...(downloadImages !== undefined && { downloadImages }),
        ...(imageQuality !== undefined && { imageQuality }),
      });
      if (format === 'text') {
        return formatEnrichedCardAsText(enriched);
      }
      return enriched;
    },
  },
  {
    name: 'card_tables.create_task',
    description:
      'Create a complete task (card with description and steps) in one operation. Recommended way to create tasks.',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'number' },
        columnId: { type: 'number' },
        title: { type: 'string' },
        content: { type: 'string' },
        due_on: { type: 'string' },
        assignee_ids: { type: 'array', items: { type: 'number' } },
        notify: { type: 'boolean' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              due_on: { type: 'string' },
              assignees: { type: 'string' },
            },
            required: ['title'],
          },
        },
      },
      required: ['projectId', 'columnId', 'title', 'content'],
    },
    zodSchema: {
      projectId: z.number().describe('Basecamp project ID'),
      columnId: z.number().describe('Column ID to create the card in'),
      title: z.string().describe('Card title'),
      content: z.string().describe('Card content/description (HTML)'),
      due_on: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      assignee_ids: z.array(z.number()).optional().describe('Array of people IDs to assign'),
      notify: z.boolean().optional().describe('Whether to notify assignees'),
      steps: z
        .array(
          z.object({
            title: z.string(),
            due_on: z.string().optional(),
            assignees: z.string().optional(),
          })
        )
        .optional()
        .describe('Checklist steps to add to the card'),
    },
    handler: async (client, args) =>
      new CardTablesResource(client).createCardWithSteps(
        (args as { projectId: number; columnId: number }).projectId,
        (args as { projectId: number; columnId: number }).columnId,
        args as {
          title: string;
          content: string;
          due_on?: string;
          assignee_ids?: number[];
          notify?: boolean;
          steps?: Array<{ title: string; due_on?: string; assignees?: string }>;
        }
      ),
  },
  {
    name: 'card_tables.update_card',
    description: 'Update a card (title, content, due_on, assignees)',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'number' },
        cardId: { type: 'number' },
        title: { type: 'string' },
        content: { type: 'string' },
        due_on: { type: 'string' },
        assignee_ids: { type: 'array', items: { type: 'number' } },
      },
      required: ['projectId', 'cardId'],
    },
    zodSchema: {
      projectId: z.number().describe('Basecamp project ID'),
      cardId: z.number().describe('Card ID to update'),
      title: z.string().optional().describe('New card title'),
      content: z.string().optional().describe('New card content/description (HTML)'),
      due_on: z.string().optional().describe('New due date in YYYY-MM-DD format'),
      assignee_ids: z.array(z.number()).optional().describe('New array of people IDs to assign'),
    },
    handler: async (client, args) =>
      new CardTablesResource(client).updateCard(
        (args as { projectId: number; cardId: number }).projectId,
        (args as { projectId: number; cardId: number }).cardId,
        args as {
          title?: string;
          content?: string;
          due_on?: string | null;
          assignee_ids?: number[];
        }
      ),
  },
  {
    name: 'card_tables.move_card',
    description: 'Move a card to another column (e.g., from "To Do" to "Done")',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'number' },
        cardId: { type: 'number' },
        columnId: { type: 'number' },
      },
      required: ['projectId', 'cardId', 'columnId'],
    },
    zodSchema: {
      projectId: z.number().describe('Basecamp project ID'),
      cardId: z.number().describe('Card ID to move'),
      columnId: z.number().describe('Target column ID'),
    },
    handler: async (client, args) =>
      new CardTablesResource(client).moveCard(
        (args as { projectId: number; cardId: number; columnId: number }).projectId,
        (args as { projectId: number; cardId: number; columnId: number }).cardId,
        (args as { projectId: number; cardId: number; columnId: number }).columnId
      ),
  },

  // === PEOPLE (for assigning tasks) ===
  {
    name: 'people.list',
    description: 'List all people in the Basecamp account (for assigning tasks)',
    schema: { type: 'object', properties: {} },
    zodSchema: {},
    handler: async client => new PeopleResource(client).list(),
  },

  // === COMMENTS ===
  {
    name: 'comments.create',
    description: 'Add a comment to a card or other recording',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'number' },
        recordingId: { type: 'number' },
        content: { type: 'string' },
      },
      required: ['projectId', 'recordingId', 'content'],
    },
    zodSchema: {
      projectId: z.number().describe('Basecamp project ID'),
      recordingId: z.number().describe('Recording ID (card, message, etc.)'),
      content: z.string().describe('Comment content (HTML)'),
    },
    handler: async (client, args) =>
      new CommentsResource(client).create(
        (args as { projectId: number; recordingId: number }).projectId,
        (args as { projectId: number; recordingId: number }).recordingId,
        { content: (args as { content: string }).content }
      ),
  },

  // === STEPS ===
  {
    name: 'steps.complete',
    description: 'Mark a step as completed or uncompleted',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'number' },
        stepId: { type: 'number' },
        completion: { type: 'string', enum: ['on', 'off'] },
      },
      required: ['projectId', 'stepId', 'completion'],
    },
    zodSchema: {
      projectId: z.number().describe('Basecamp project ID'),
      stepId: z.number().describe('Step ID'),
      completion: z.enum(['on', 'off']).describe('Set to "on" to complete, "off" to uncomplete'),
    },
    handler: async (client, args) =>
      new StepsResource(client).complete(
        (
          args as {
            projectId: number;
            stepId: number;
            completion: 'on' | 'off';
          }
        ).projectId,
        (
          args as {
            projectId: number;
            stepId: number;
            completion: 'on' | 'off';
          }
        ).stepId,
        (
          args as {
            projectId: number;
            stepId: number;
            completion: 'on' | 'off';
          }
        ).completion
      ),
  },
];
