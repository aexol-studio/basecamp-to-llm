import { BasecampClient } from '../client.js';
import type { Project } from '../types.js';

export interface ListProjectsParams {
  status?: 'archived' | 'trashed';
  page?: number;
}

export class ProjectsResource {
  constructor(private readonly client: BasecampClient) {}

  list(params: ListProjectsParams = {}) {
    return this.client.get<Project[]>('/projects.json', { query: params as any });
  }

  get(projectId: number) {
    return this.client.get<Project>(`/projects/${projectId}.json`);
  }

  create(body: Partial<Project> & { name: string }) {
    return this.client.post<Project>('/projects.json', body);
  }

  update(projectId: number, body: Partial<Project>) {
    return this.client.put<Project>(`/projects/${projectId}.json`, body);
  }

  trash(projectId: number) {
    return this.client.delete<void>(`/projects/${projectId}.json`);
  }
}
