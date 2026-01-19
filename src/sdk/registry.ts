import { BasecampClient } from './client.js';
import { ProjectsResource } from './resources/projects.js';
import { CardTablesResource } from './resources/cardTables.js';
import { PeopleResource } from './resources/people.js';
import { CommentsResource } from './resources/comments.js';
import { StepsResource } from './resources/steps.js';
import { getEnrichedCard, formatEnrichedCardAsText } from './resources/enrichedCards.js';

export type ActionHandler = (
  client: BasecampClient,
  args: Record<string, unknown>
) => Promise<unknown>;

export interface ActionDef {
  name: string; // e.g. projects.list
  description: string;
  schema: Record<string, unknown>; // JSON schema-like input description
  handler: ActionHandler;
}

export const actions: ActionDef[] = [
  // === PROJECTS (read-only) ===
  {
    name: 'projects.list',
    description: 'List projects (optional status=archived|trashed, page)',
    schema: {
      type: 'object',
      properties: { status: { type: 'string' }, page: { type: 'number' } },
    },
    handler: async (client, args) =>
      new ProjectsResource(client).list(
        (args as { status?: 'archived' | 'trashed'; page?: number }) || {}
      ),
  },

  // === CARD TABLES ===
  {
    name: 'card_tables.get',
    description: 'Get a card table (kanban board) by ID with all columns and cards',
    schema: {
      type: 'object',
      properties: { projectId: { type: 'number' }, tableId: { type: 'number' } },
      required: ['projectId', 'tableId'],
    },
    handler: async (client, args) =>
      new CardTablesResource(client).get(
        (args as { projectId: number; tableId: number }).projectId,
        (args as { projectId: number; tableId: number }).tableId
      ),
  },
  {
    name: 'card_tables.get_card',
    description: 'Get a card by ID with basic info',
    schema: {
      type: 'object',
      properties: { projectId: { type: 'number' }, cardId: { type: 'number' } },
      required: ['projectId', 'cardId'],
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
      },
      required: ['projectId', 'cardId'],
    },
    handler: async (client, args) => {
      const { projectId, cardId, format } = args as {
        projectId: number;
        cardId: number;
        format?: 'json' | 'text';
      };
      const enriched = await getEnrichedCard(client, projectId, cardId);
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
    handler: async (client, args) =>
      new StepsResource(client).complete(
        (args as { projectId: number; stepId: number; completion: 'on' | 'off' }).projectId,
        (args as { projectId: number; stepId: number; completion: 'on' | 'off' }).stepId,
        (args as { projectId: number; stepId: number; completion: 'on' | 'off' }).completion
      ),
  },
];
