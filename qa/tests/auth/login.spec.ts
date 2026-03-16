import { test, expect } from '../../src/fixtures/test.fixture';
import { readState } from '../../src/global-setup';
import { ApiClient } from '../../src/api/api-client';
import { AuthApi } from '../../src/api/auth.api';

test.describe('User Login @ui', () => {
  test('should login with valid credentials', async ({ loginPage }) => {
    const { testUser } = readState();
    await loginPage.goto();
    await loginPage.login(testUser.username, testUser.password);
    await loginPage.expectLoginSuccess();
  });

  test('should show error with invalid password', async ({ loginPage }) => {
    const { testUser } = readState();
    await loginPage.goto();
    await loginPage.login(testUser.username, 'WrongPassword123!');
    await loginPage.expectLoginError();
  });

  test('should show error with non-existent user', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login('nonexistent_user_xyz123', 'AnyPassword123!');
    await loginPage.expectLoginError();
  });

  test('should have a link to register page', async ({ loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.registerLink).toBeVisible();
  });

  test('should navigate to register page via link', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.goToRegister();
    await expect(loginPage.page).toHaveURL(/\/register/);
  });
});

test.describe('User Login @api', () => {
  test('should login via API and receive a token', async () => {
    const { testUser } = readState();
    const client = new ApiClient();
    const authApi = new AuthApi(client);

    const response = await authApi.login({
      username: testUser.username,
      password: testUser.password,
    });

    expect(response.status).toBe(200);
    expect(response.data.token).toBeTruthy();
    await client.dispose();
  });

  test('should fail login with wrong password via API', async () => {
    const { testUser } = readState();
    const client = new ApiClient();
    const authApi = new AuthApi(client);

    const response = await authApi.login({
      username: testUser.username,
      password: 'WrongPassword!',
    });

    expect(response.status).not.toBe(200);
    await client.dispose();
  });
});
