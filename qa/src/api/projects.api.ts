import { ApiClient } from './api-client';
import { Project, ProjectPayload } from '../types';

export class ProjectsApi {
  constructor(private readonly client: ApiClient) {}

  async list(): Promise<{ status: number; data: Project[] }> {
    return this.client.get<Project[]>('projects');
  }

  async get(id: number): Promise<{ status: number; data: Project }> {
    return this.client.get<Project>(`projects/${id}`);
  }

  async create(payload: ProjectPayload): Promise<{ status: number; data: Project }> {
    return this.client.put<Project>('projects', payload as unknown as Record<string, unknown>);
  }

  async update(id: number, payload: Partial<ProjectPayload>): Promise<{ status: number; data: Project }> {
    return this.client.post<Project>(`projects/${id}`, payload as unknown as Record<string, unknown>);
  }

  async delete(id: number): Promise<{ status: number; data: unknown }> {
    return this.client.delete(`projects/${id}`);
  }
}
