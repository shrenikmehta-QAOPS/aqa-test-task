import { APIRequestContext, APIResponse, request } from '@playwright/test';
import { ENV } from '../config/env.config';

export class ApiClient {
  private token: string | null = null;
  private context: APIRequestContext | null = null;

  constructor(private readonly baseUrl: string = ENV.API_URL) {}

  setToken(token: string): void {
    if (this.token === token) return;
    this.token = token;
    if (this.context) {
      this.context.dispose().catch(() => {});
      this.context = null;
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async getContext(): Promise<APIRequestContext> {
    if (!this.context) {
      this.context = await request.newContext({
        baseURL: this.baseUrl,
        extraHTTPHeaders: this.token
          ? { Authorization: `Bearer ${this.token}` }
          : {},
      });
    }
    return this.context;
  }

  private async executeWithRetry<T>(
    fn: (ctx: APIRequestContext) => Promise<APIResponse>,
  ): Promise<{ status: number; data: T }> {
    const ctx = await this.getContext();
    let response = await fn(ctx);

    if (response.status() === 429) {
      await new Promise((r) => setTimeout(r, 12_000));
      response = await fn(ctx);
    }

    const data = await response.json().catch(() => null);
    return { status: response.status(), data: data as T };
  }

  async get<T>(endpoint: string): Promise<{ status: number; data: T }> {
    return this.executeWithRetry<T>((ctx) => ctx.get(endpoint));
  }

  async post<T>(endpoint: string, body?: Record<string, unknown>): Promise<{ status: number; data: T }> {
    return this.executeWithRetry<T>((ctx) => ctx.post(endpoint, { data: body }));
  }

  async put<T>(endpoint: string, body?: Record<string, unknown>): Promise<{ status: number; data: T }> {
    return this.executeWithRetry<T>((ctx) => ctx.put(endpoint, { data: body }));
  }

  async delete<T = unknown>(endpoint: string): Promise<{ status: number; data: T }> {
    return this.executeWithRetry<T>((ctx) => ctx.delete(endpoint));
  }

  async dispose(): Promise<void> {
    if (this.context) {
      await this.context.dispose();
      this.context = null;
    }
  }
}
