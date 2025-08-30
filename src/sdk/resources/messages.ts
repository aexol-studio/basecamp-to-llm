import { BasecampClient } from '../client.js';
import type { Message } from '../types.js';

export class MessagesResource {
  constructor(private readonly client: BasecampClient) {}

  list(projectId: number, boardId: number, params: { page?: number } = {}) {
    return this.client.get<Message[]>(
      `/buckets/${projectId}/message_boards/${boardId}/messages.json`,
      { query: params as Record<string, string | number | boolean | undefined> }
    );
  }

  get(projectId: number, messageId: number) {
    return this.client.get<Message>(`/buckets/${projectId}/messages/${messageId}.json`);
  }

  create(projectId: number, boardId: number, body: { subject: string; content: string }) {
    return this.client.post<Message>(
      `/buckets/${projectId}/message_boards/${boardId}/messages.json`,
      body
    );
  }
}
