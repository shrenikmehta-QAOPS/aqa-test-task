import { ApiClient } from './api-client';
import { LoginRequest, LoginResponse, RegisterRequest } from '../types';

export class AuthApi {
  constructor(private readonly client: ApiClient) {}

  async register(data: RegisterRequest): Promise<{ status: number; data: LoginResponse }> {
    return this.client.post<LoginResponse>('register', data as unknown as Record<string, unknown>);
  }

  async login(data: LoginRequest): Promise<{ status: number; data: LoginResponse }> {
    const response = await this.client.post<LoginResponse>('login', data as unknown as Record<string, unknown>);
    if (response.status === 200 && response.data?.token) {
      this.client.setToken(response.data.token);
    }
    return response;
  }

  async registerAndLogin(username: string, email: string, password: string): Promise<ApiClient> {
    await this.register({ username, email, password });
    await this.login({ username, password });
    return this.client;
  }
}
