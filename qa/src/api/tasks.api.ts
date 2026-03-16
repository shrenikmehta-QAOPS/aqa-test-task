import { ApiClient } from './api-client';
import { Task, TaskPayload } from '../types';

export class TasksApi {
  constructor(private readonly client: ApiClient) {}

  async listAll(): Promise<{ status: number; data: Task[] }> {
    return this.client.get<Task[]>('tasks/all');
  }

  async listByProject(projectId: number): Promise<{ status: number; data: Task[] }> {
    return this.client.get<Task[]>(`projects/${projectId}/tasks`);
  }

  async get(id: number): Promise<{ status: number; data: Task }> {
    return this.client.get<Task>(`tasks/${id}`);
  }

  async create(projectId: number, payload: TaskPayload): Promise<{ status: number; data: Task }> {
    return this.client.put<Task>(
      `projects/${projectId}/tasks`,
      payload as unknown as Record<string, unknown>,
    );
  }

  async update(id: number, payload: Partial<TaskPayload>): Promise<{ status: number; data: Task }> {
    return this.client.post<Task>(`tasks/${id}`, payload as unknown as Record<string, unknown>);
  }

  async delete(id: number): Promise<{ status: number; data: unknown }> {
    return this.client.delete(`tasks/${id}`);
  }

  async setDone(id: number, done: boolean): Promise<{ status: number; data: Task }> {
    return this.update(id, { done });
  }
}
