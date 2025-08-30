import { BasecampClient } from './client.js';
import { ProjectsResource } from './resources/projects.js';
import { TodosResource } from './resources/todos.js';
import { CardTablesResource } from './resources/cardTables.js';
import { PeopleResource } from './resources/people.js';
import { MessagesResource } from './resources/messages.js';
import { CommentsResource } from './resources/comments.js';

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

function projectsList(): ActionDef {
  return {
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
  };
}

function projectsGet(): ActionDef {
  return {
    name: 'projects.get',
    description: 'Get a project by ID',
    schema: {
      type: 'object',
      properties: { projectId: { type: 'number' } },
      required: ['projectId'],
    },
    handler: async (client, args) =>
      new ProjectsResource(client).get((args as { projectId: number }).projectId),
  };
}

function todosList(): ActionDef {
  return {
    name: 'todos.list',
    description: 'List todos in a todolist (projectId, listId, optional status/completed/page)',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'number' },
        listId: { type: 'number' },
        status: { type: 'string' },
        completed: { type: 'boolean' },
        page: { type: 'number' },
      },
      required: ['projectId', 'listId'],
    },
    handler: async (client, args) =>
      new TodosResource(client).list(
        (args as { projectId: number; listId: number }).projectId,
        (args as { projectId: number; listId: number }).listId,
        (args as { status?: 'archived' | 'trashed'; completed?: boolean; page?: number }) || {}
      ),
  };
}

function todosGet(): ActionDef {
  return {
    name: 'todos.get',
    description: 'Get a todo by ID',
    schema: {
      type: 'object',
      properties: { projectId: { type: 'number' }, todoId: { type: 'number' } },
      required: ['projectId', 'todoId'],
    },
    handler: async (client, args) =>
      new TodosResource(client).get(
        (args as { projectId: number; todoId: number }).projectId,
        (args as { projectId: number; todoId: number }).todoId
      ),
  };
}

function cardTablesGet(): ActionDef {
  return {
    name: 'card_tables.get',
    description: 'Get a card table by ID',
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
  };
}

function peopleList(): ActionDef {
  return {
    name: 'people.list',
    description: 'List people',
    schema: { type: 'object', properties: {} },
    handler: async client => new PeopleResource(client).list(),
  };
}

function messagesList(): ActionDef {
  return {
    name: 'messages.list',
    description: 'List messages for a message board',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'number' },
        boardId: { type: 'number' },
        page: { type: 'number' },
      },
      required: ['projectId', 'boardId'],
    },
    handler: async (client, args) => {
      const page = (args as { page?: number }).page;
      const params = page === undefined ? {} : { page };
      return new MessagesResource(client).list(
        (args as { projectId: number; boardId: number }).projectId,
        (args as { projectId: number; boardId: number }).boardId,
        params
      );
    },
  };
}

function commentsListForRecording(): ActionDef {
  return {
    name: 'comments.list_for_recording',
    description: 'List comments for a recording (todo/message/etc.)',
    schema: {
      type: 'object',
      properties: { projectId: { type: 'number' }, recordingId: { type: 'number' } },
      required: ['projectId', 'recordingId'],
    },
    handler: async (client, args) =>
      new CommentsResource(client).listForRecording(
        (args as { projectId: number; recordingId: number }).projectId,
        (args as { projectId: number; recordingId: number }).recordingId
      ),
  };
}

export const actions: ActionDef[] = [
  projectsList(),
  projectsGet(),
  // project mutations
  {
    name: 'projects.create',
    description: 'Create a project (name, optional description)',
    schema: {
      type: 'object',
      properties: { name: { type: 'string' }, description: { type: 'string' } },
      required: ['name'],
    },
    handler: async (client, args) =>
      new ProjectsResource(client).create(args as { name: string; description?: string }),
  },
  {
    name: 'projects.update',
    description: 'Update a project (projectId, fields...)',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'number' },
        name: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['projectId'],
    },
    handler: async (client, args) =>
      new ProjectsResource(client).update(
        (args as { projectId: number }).projectId,
        args as Partial<{ name: string; description: string }>
      ),
  },
  {
    name: 'projects.trash',
    description: 'Trash a project by ID',
    schema: {
      type: 'object',
      properties: { projectId: { type: 'number' } },
      required: ['projectId'],
    },
    handler: async (client, args) =>
      new ProjectsResource(client).trash((args as { projectId: number }).projectId),
  },
  todosList(),
  todosGet(),
  {
    name: 'todos.create',
    description:
      'Create a to-do (projectId, listId, content, optional description/dates/assignees)',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'number' },
        listId: { type: 'number' },
        content: { type: 'string' },
        description: { type: 'string' },
        due_on: { type: 'string' },
        starts_on: { type: 'string' },
        assignee_ids: { type: 'array', items: { type: 'number' } },
      },
      required: ['projectId', 'listId', 'content'],
    },
    handler: async (client, args) =>
      new TodosResource(client).create(
        (args as { projectId: number; listId: number }).projectId,
        (args as { projectId: number; listId: number }).listId,
        args as {
          content: string;
          description?: string;
          due_on?: string | null;
          starts_on?: string | null;
          assignee_ids?: number[];
        }
      ),
  },
  {
    name: 'todos.update',
    description: 'Update a to-do (projectId, todoId, fields...)',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'number' },
        todoId: { type: 'number' },
        content: { type: 'string' },
        description: { type: 'string' },
        due_on: { type: 'string' },
        starts_on: { type: 'string' },
        assignee_ids: { type: 'array', items: { type: 'number' } },
      },
      required: ['projectId', 'todoId'],
    },
    handler: async (client, args) =>
      new TodosResource(client).update(
        (args as { projectId: number; todoId: number }).projectId,
        (args as { projectId: number; todoId: number }).todoId,
        args as Partial<{
          content: string;
          description: string | null;
          due_on: string | null;
          starts_on: string | null;
          assignee_ids: number[];
        }>
      ),
  },
  {
    name: 'todos.complete',
    description: 'Mark a to-do as complete',
    schema: {
      type: 'object',
      properties: { projectId: { type: 'number' }, todoId: { type: 'number' } },
      required: ['projectId', 'todoId'],
    },
    handler: async (client, args) =>
      new TodosResource(client).complete(
        (args as { projectId: number; todoId: number }).projectId,
        (args as { projectId: number; todoId: number }).todoId
      ),
  },
  {
    name: 'todos.uncomplete',
    description: 'Uncomplete a to-do',
    schema: {
      type: 'object',
      properties: { projectId: { type: 'number' }, todoId: { type: 'number' } },
      required: ['projectId', 'todoId'],
    },
    handler: async (client, args) =>
      new TodosResource(client).uncomplete(
        (args as { projectId: number; todoId: number }).projectId,
        (args as { projectId: number; todoId: number }).todoId
      ),
  },
  cardTablesGet(),
  {
    name: 'card_tables.get_column',
    description: 'Get a card table column by ID',
    schema: {
      type: 'object',
      properties: { projectId: { type: 'number' }, columnId: { type: 'number' } },
      required: ['projectId', 'columnId'],
    },
    handler: async (client, args) =>
      new CardTablesResource(client).getColumn(
        (args as { projectId: number; columnId: number }).projectId,
        (args as { projectId: number; columnId: number }).columnId
      ),
  },
  {
    name: 'card_tables.get_card',
    description: 'Get a card by ID',
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
    name: 'card_tables.create_card',
    description: 'Create a card in column (projectId, columnId, title, optional description)',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'number' },
        columnId: { type: 'number' },
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['projectId', 'columnId', 'title'],
    },
    handler: async (client, args) =>
      new CardTablesResource(client).createCard(
        (args as { projectId: number; columnId: number }).projectId,
        (args as { projectId: number; columnId: number }).columnId,
        args as { title: string; description?: string }
      ),
  },
  peopleList(),
  {
    name: 'people.get',
    description: 'Get a person by ID',
    schema: {
      type: 'object',
      properties: { personId: { type: 'number' } },
      required: ['personId'],
    },
    handler: async (client, args) =>
      new PeopleResource(client).get((args as { personId: number }).personId),
  },
  messagesList(),
  {
    name: 'messages.get',
    description: 'Get a message by ID',
    schema: {
      type: 'object',
      properties: { projectId: { type: 'number' }, messageId: { type: 'number' } },
      required: ['projectId', 'messageId'],
    },
    handler: async (client, args) =>
      new MessagesResource(client).get(
        (args as { projectId: number; messageId: number }).projectId,
        (args as { projectId: number; messageId: number }).messageId
      ),
  },
  {
    name: 'messages.create',
    description: 'Create a message (projectId, boardId, subject, content)',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'number' },
        boardId: { type: 'number' },
        subject: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['projectId', 'boardId', 'subject', 'content'],
    },
    handler: async (client, args) =>
      new MessagesResource(client).create(
        (args as { projectId: number; boardId: number }).projectId,
        (args as { projectId: number; boardId: number }).boardId,
        {
          subject: (args as { subject: string }).subject,
          content: (args as { content: string }).content,
        }
      ),
  },
  commentsListForRecording(),
  {
    name: 'comments.get',
    description: 'Get a comment by ID',
    schema: {
      type: 'object',
      properties: { projectId: { type: 'number' }, commentId: { type: 'number' } },
      required: ['projectId', 'commentId'],
    },
    handler: async (client, args) =>
      new CommentsResource(client).get(
        (args as { projectId: number; commentId: number }).projectId,
        (args as { projectId: number; commentId: number }).commentId
      ),
  },
  {
    name: 'comments.create',
    description: 'Create a comment (projectId, recordingId, content)',
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
  {
    name: 'comments.update',
    description: 'Update a comment (projectId, commentId, content)',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'number' },
        commentId: { type: 'number' },
        content: { type: 'string' },
      },
      required: ['projectId', 'commentId', 'content'],
    },
    handler: async (client, args) =>
      new CommentsResource(client).update(
        (args as { projectId: number; commentId: number }).projectId,
        (args as { projectId: number; commentId: number }).commentId,
        { content: (args as { content: string }).content }
      ),
  },
];
