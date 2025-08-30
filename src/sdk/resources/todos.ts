import { BasecampClient } from '../client.js';
import type { Todo } from '../types.js';

export interface ListTodosParams {
  status?: 'archived' | 'trashed';
  completed?: boolean;
  page?: number;
}

export interface CreateTodoBody {
  content: string;
  description?: string;
  due_on?: string | null;
  starts_on?: string | null;
  assignee_ids?: number[];
}

export interface UpdateTodoBody {
  content?: string;
  description?: string | null;
  due_on?: string | null;
  starts_on?: string | null;
  assignee_ids?: number[];
}

export class TodosResource {
  constructor(private readonly client: BasecampClient) {}

  list(projectId: number, todolistId: number, params: ListTodosParams = {}) {
    return this.client.get<Todo[]>(`/buckets/${projectId}/todolists/${todolistId}/todos.json`, {
      query: params as Record<string, string | number | boolean | undefined>,
    });
  }

  get(projectId: number, todoId: number) {
    return this.client.get<Todo>(`/buckets/${projectId}/todos/${todoId}.json`);
  }

  create(projectId: number, listId: number, body: CreateTodoBody) {
    return this.client.post<Todo>(`/buckets/${projectId}/todolists/${listId}/todos.json`, body);
  }

  update(projectId: number, todoId: number, body: UpdateTodoBody) {
    return this.client.put<Todo>(`/buckets/${projectId}/todos/${todoId}.json`, body);
  }

  complete(projectId: number, todoId: number) {
    return this.client.post<void>(`/buckets/${projectId}/todos/${todoId}/completion.json`, {});
  }

  uncomplete(projectId: number, todoId: number) {
    return this.client.delete<void>(`/buckets/${projectId}/todos/${todoId}/completion.json`);
  }
}
