import { BasecampClient } from '../client.js';
import type { Comment } from '../types.js';

export class CommentsResource {
  constructor(private readonly client: BasecampClient) {}

  /**
   * List comments for a recording (first page only)
   */
  listForRecording(projectId: number, recordingId: number) {
    return this.client.get<Comment[]>(
      `/buckets/${projectId}/recordings/${recordingId}/comments.json`
    );
  }

  /**
   * List ALL comments for a recording (handles pagination automatically)
   */
  listAllForRecording(projectId: number, recordingId: number) {
    return this.client.getAllPages<Comment>(
      `/buckets/${projectId}/recordings/${recordingId}/comments.json`
    );
  }

  get(projectId: number, commentId: number) {
    return this.client.get<Comment>(`/buckets/${projectId}/comments/${commentId}.json`);
  }

  create(projectId: number, recordingId: number, body: { content: string }) {
    return this.client.post<Comment>(
      `/buckets/${projectId}/recordings/${recordingId}/comments.json`,
      body
    );
  }

  update(projectId: number, commentId: number, body: { content: string }) {
    return this.client.put<Comment>(`/buckets/${projectId}/comments/${commentId}.json`, body);
  }
}
