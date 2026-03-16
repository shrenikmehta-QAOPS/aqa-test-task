import { test, expect } from '../../src/fixtures/test.fixture';
import { readState } from '../../src/global-setup';
import { TestDataHelper } from '../../src/helpers/test-data.helper';
import { ApiClient } from '../../src/api/api-client';
import { AuthApi } from '../../src/api/auth.api';
import { ProjectsApi } from '../../src/api/projects.api';
import { TasksApi } from '../../src/api/tasks.api';

test.describe('Tasks CRUD @api', () => {
  let apiClient: ApiClient;
  let projectsApi: ProjectsApi;
  let tasksApi: TasksApi;
  let projectId: number;

  test.beforeAll(async () => {
    const { testUser } = readState();
    apiClient = new ApiClient();
    const authApi = new AuthApi(apiClient);
    await authApi.login({ username: testUser.username, password: testUser.password });
    projectsApi = new ProjectsApi(apiClient);
    tasksApi = new TasksApi(apiClient);

    const project = await projectsApi.create({
      title: TestDataHelper.uniqueProjectTitle('Tasks Test'),
    });
    projectId = project.data.id;
  });

  test.afterAll(async () => {
    await apiClient.dispose();
  });

  test('should create a task in a project', async () => {
    const title = TestDataHelper.uniqueTaskTitle();

    const response = await tasksApi.create(projectId, { title, description: 'Created via API test' });

    expect([200, 201]).toContain(response.status);
    expect(response.data.title).toBe(title);
    expect(response.data.description).toBe('Created via API test');
    expect(response.data.id).toBeGreaterThan(0);
  });

  test('should read a task by ID', async () => {
    const title = TestDataHelper.uniqueTaskTitle();
    const created = await tasksApi.create(projectId, { title });

    const response = await tasksApi.get(created.data.id);

    expect(response.status).toBe(200);
    expect(response.data.title).toBe(title);
    expect(response.data.id).toBe(created.data.id);
  });

  test('should list tasks in a project', async () => {
    const title = TestDataHelper.uniqueTaskTitle();
    await tasksApi.create(projectId, { title });

    const response = await tasksApi.listByProject(projectId);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    const found = response.data.find((t) => t.title === title);
    expect(found).toBeDefined();
  });

  test('should update a task title', async () => {
    const original = TestDataHelper.uniqueTaskTitle('Original');
    const created = await tasksApi.create(projectId, { title: original });

    const updated = TestDataHelper.uniqueTaskTitle('Updated');
    const response = await tasksApi.update(created.data.id, { title: updated });

    expect(response.status).toBe(200);
    expect(response.data.title).toBe(updated);
  });

  test('should delete a task', async () => {
    const title = TestDataHelper.uniqueTaskTitle();
    const created = await tasksApi.create(projectId, { title });

    const deleteResponse = await tasksApi.delete(created.data.id);
    expect(deleteResponse.status).toBe(200);

    const getResponse = await tasksApi.get(created.data.id);
    expect([403, 404, 500]).toContain(getResponse.status);
  });
});
