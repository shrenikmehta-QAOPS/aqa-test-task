export interface LoginRequest {
  username: string;
  password: string;
  long_token?: boolean;
}

export interface LoginResponse {
  token?: string;
  message?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  is_archived: boolean;
  created: string;
  updated: string;
}

export interface ProjectPayload {
  title: string;
  description?: string;
  is_archived?: boolean;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  done: boolean;
  priority: number;
  project_id: number;
  created: string;
  updated: string;
}

export interface TaskPayload {
  title: string;
  description?: string;
  done?: boolean;
  priority?: number;
}
