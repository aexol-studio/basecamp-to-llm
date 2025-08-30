import { BasecampClient } from './client.js';
import { ProjectsResource } from './resources/projects.js';
import { TodosResource } from './resources/todos.js';
import { CardTablesResource } from './resources/cardTables.js';
import { PeopleResource } from './resources/people.js';
import { MessagesResource } from './resources/messages.js';
import { CommentsResource } from './resources/comments.js';

export type ActionHandler = (client: BasecampClient, args: any) => Promise<unknown>;

export interface ActionDef {
  name: string; // e.g. projects.list
  description: string;
  schema: Record<string, any>; // JSON schema-like input description
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
    handler: async (client, args) => new ProjectsResource(client).list(args || {}),
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
    handler: async (client, { projectId }) => new ProjectsResource(client).get(projectId),
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
    handler: async (client, { projectId, listId, ...params }) =>
      new TodosResource(client).list(projectId, listId, params),
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
    handler: async (client, { projectId, todoId }) =>
      new TodosResource(client).get(projectId, todoId),
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
    handler: async (client, { projectId, tableId }) =>
      new CardTablesResource(client).get(projectId, tableId),
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
    handler: async (client, { projectId, boardId, page }) =>
      new MessagesResource(client).list(projectId, boardId, { page }),
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
    handler: async (client, { projectId, recordingId }) =>
      new CommentsResource(client).listForRecording(projectId, recordingId),
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
    handler: async (client, { name, description }) =>
      new ProjectsResource(client).create({ name, description }),
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
    handler: async (client, { projectId, ...fields }) =>
      new ProjectsResource(client).update(projectId, fields),
  },
  {
    name: 'projects.trash',
    description: 'Trash a project by ID',
    schema: {
      type: 'object',
      properties: { projectId: { type: 'number' } },
      required: ['projectId'],
    },
    handler: async (client, { projectId }) => new ProjectsResource(client).trash(projectId),
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
    handler: async (client, { projectId, listId, ...body }) =>
      new TodosResource(client).create(projectId, listId, body),
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
    handler: async (client, { projectId, todoId, ...fields }) =>
      new TodosResource(client).update(projectId, todoId, fields),
  },
  {
    name: 'todos.complete',
    description: 'Mark a to-do as complete',
    schema: {
      type: 'object',
      properties: { projectId: { type: 'number' }, todoId: { type: 'number' } },
      required: ['projectId', 'todoId'],
    },
    handler: async (client, { projectId, todoId }) =>
      new TodosResource(client).complete(projectId, todoId),
  },
  {
    name: 'todos.uncomplete',
    description: 'Uncomplete a to-do',
    schema: {
      type: 'object',
      properties: { projectId: { type: 'number' }, todoId: { type: 'number' } },
      required: ['projectId', 'todoId'],
    },
    handler: async (client, { projectId, todoId }) =>
      new TodosResource(client).uncomplete(projectId, todoId),
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
    handler: async (client, { projectId, columnId }) =>
      new CardTablesResource(client).getColumn(projectId, columnId),
  },
  {
    name: 'card_tables.get_card',
    description: 'Get a card by ID',
    schema: {
      type: 'object',
      properties: { projectId: { type: 'number' }, cardId: { type: 'number' } },
      required: ['projectId', 'cardId'],
    },
    handler: async (client, { projectId, cardId }) =>
      new CardTablesResource(client).getCard(projectId, cardId),
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
    handler: async (client, { projectId, columnId, ...body }) =>
      new CardTablesResource(client).createCard(projectId, columnId, body),
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
    handler: async (client, { personId }) => new PeopleResource(client).get(personId),
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
    handler: async (client, { projectId, messageId }) =>
      new MessagesResource(client).get(projectId, messageId),
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
    handler: async (client, { projectId, boardId, subject, content }) =>
      new MessagesResource(client).create(projectId, boardId, { subject, content }),
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
    handler: async (client, { projectId, commentId }) =>
      new CommentsResource(client).get(projectId, commentId),
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
    handler: async (client, { projectId, recordingId, content }) =>
      new CommentsResource(client).create(projectId, recordingId, { content }),
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
    handler: async (client, { projectId, commentId, content }) =>
      new CommentsResource(client).update(projectId, commentId, { content }),
  },
];
