import { test, expect } from '../../src/fixtures/test.fixture';
import { readState } from '../../src/global-setup';
import { TestDataHelper } from '../../src/helpers/test-data.helper';
import {
  expectDeletedResourceInaccessible,
  expectHttpStatus,
  expectHttpStatusOneOf,
} from '../../src/helpers/api-assertions';
import { HttpStatus } from '../../src/constants/http';
import { attachJson } from '../../src/helpers/test-context';
import { ApiClient } from '../../src/api/api-client';
import { AuthApi } from '../../src/api/auth.api';
import { ProjectsApi } from '../../src/api/projects.api';
import { TasksApi } from '../../src/api/tasks.api';

test.describe('Tasks CRUD — API', () => {
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
    expectHttpStatusOneOf(
      project.status,
      [HttpStatus.OK, HttpStatus.CREATED],
      'PUT /projects (test setup)',
      project.data,
    );
    projectId = project.data.id;
  });

  test.afterAll(async () => {
    await apiClient.dispose();
  });

  type TaskCreateBody = { title: string; description?: string };

  const createCases: { name: string; build: () => TaskCreateBody }[] = [
    {
      name: 'title and description',
      build: () => ({
        title: TestDataHelper.uniqueTaskTitle(),
        description: 'Created via API test',
      }),
    },
    {
      name: 'title only',
      build: () => ({
        title: TestDataHelper.uniqueTaskTitle(),
      }),
    },
  ];

  test('should create tasks (data-driven shapes)', { tag: ['@smoke', '@api', '@regression'] }, async ({}, testInfo) => {
    for (const scenario of createCases) {
      const body = scenario.build();
      const response = await tasksApi.create(projectId, body);

      if (response.status !== HttpStatus.OK && response.status !== HttpStatus.CREATED) {
        await attachJson(testInfo, `task-create-${scenario.name}.json`, {
          status: response.status,
          body: response.data,
        });
      }

      expectHttpStatusOneOf(
        response.status,
        [HttpStatus.OK, HttpStatus.CREATED],
        `PUT /projects/${projectId}/tasks (${scenario.name})`,
        response.data,
      );
      expect(response.data.title, `Task title should match payload (${scenario.name})`).toBe(body.title);
      if (body.description !== undefined) {
        expect(response.data.description, `Description should match (${scenario.name})`).toBe(
          body.description,
        );
      }
      expect(response.data.id, `Task id should be positive (${scenario.name})`).toBeGreaterThan(0);
    }
  });

  test('should read a task by id', { tag: ['@api', '@regression'] }, async ({}, testInfo) => {
    const title = TestDataHelper.uniqueTaskTitle();
    const created = await tasksApi.create(projectId, { title });

    expectHttpStatusOneOf(
      created.status,
      [HttpStatus.OK, HttpStatus.CREATED],
      'Setup: create task for GET',
      created.data,
    );

    const response = await tasksApi.get(created.data.id);

    if (response.status !== HttpStatus.OK) {
      await attachJson(testInfo, 'task-get-response.json', { status: response.status, body: response.data });
    }

    expectHttpStatus(response.status, HttpStatus.OK, `GET /tasks/${created.data.id}`, response.data);
    expect(response.data.title, 'GET should return the same title').toBe(title);
    expect(response.data.id, 'GET should return the same id').toBe(created.data.id);
  });

  test('should list tasks for a project', { tag: ['@api', '@regression'] }, async ({}, testInfo) => {
    const title = TestDataHelper.uniqueTaskTitle();
    const created = await tasksApi.create(projectId, { title });
    expectHttpStatusOneOf(
      created.status,
      [HttpStatus.OK, HttpStatus.CREATED],
      'Setup: create task for list',
      created.data,
    );

    const response = await tasksApi.listByProject(projectId);

    if (response.status !== HttpStatus.OK) {
      await attachJson(testInfo, 'task-list-response.json', { status: response.status, body: response.data });
    }

    expectHttpStatus(response.status, HttpStatus.OK, `GET /projects/${projectId}/tasks`, response.data);
    expect(Array.isArray(response.data), 'List payload should be an array').toBe(true);
    const found = response.data.find((t) => t.title === title);
    expect(found, `Created task title should appear in list`).toBeDefined();
  });

  test('should update a task title', { tag: ['@api', '@regression'] }, async ({}, testInfo) => {
    const original = TestDataHelper.uniqueTaskTitle('Original');
    const created = await tasksApi.create(projectId, { title: original });
    expectHttpStatusOneOf(
      created.status,
      [HttpStatus.OK, HttpStatus.CREATED],
      'Setup: create task for update',
      created.data,
    );

    const updated = TestDataHelper.uniqueTaskTitle('Updated');
    const response = await tasksApi.update(created.data.id, { title: updated });

    if (response.status !== HttpStatus.OK) {
      await attachJson(testInfo, 'task-update-response.json', {
        status: response.status,
        body: response.data,
      });
    }

    expectHttpStatus(response.status, HttpStatus.OK, `POST /tasks/${created.data.id}`, response.data);
    expect(response.data.title, 'Updated title should be persisted').toBe(updated);
  });

  test('should delete a task and block subsequent fetch', { tag: ['@api', '@regression'] }, async ({}, testInfo) => {
    const title = TestDataHelper.uniqueTaskTitle();
    const created = await tasksApi.create(projectId, { title });
    expectHttpStatusOneOf(
      created.status,
      [HttpStatus.OK, HttpStatus.CREATED],
      'Setup: create task for delete',
      created.data,
    );

    const deleteResponse = await tasksApi.delete(created.data.id);
    expectHttpStatus(deleteResponse.status, HttpStatus.OK, `DELETE /tasks/${created.data.id}`, deleteResponse.data);

    const getResponse = await tasksApi.get(created.data.id);
    const isInaccessible =
      getResponse.status === HttpStatus.NOT_FOUND || getResponse.status === HttpStatus.FORBIDDEN;
    if (!isInaccessible) {
      await attachJson(testInfo, 'task-get-after-delete.json', {
        status: getResponse.status,
        body: getResponse.data,
      });
    }

    expectDeletedResourceInaccessible(
      getResponse.status,
      getResponse.data,
      `GET /tasks/${created.data.id} after delete`,
    );
  });
});
