import { test, expect } from '../../src/fixtures/test.fixture';
import { readState } from '../../src/global-setup';
import { TestDataHelper } from '../../src/helpers/test-data.helper';
import { ApiClient } from '../../src/api/api-client';
import { AuthApi } from '../../src/api/auth.api';

test.describe('User Registration @ui', () => {
  test('should register a new user successfully', async ({ registerPage }) => {
    const user = TestDataHelper.uniqueUser();
    await registerPage.goto();
    await registerPage.register(user.username, user.email, user.password);
    await registerPage.expectRegistrationSuccess();
  });

  test('should show error for duplicate username', async ({ registerPage }) => {
    const { testUser } = readState();
    await registerPage.goto();
    await registerPage.register(
      testUser.username,
      TestDataHelper.uniqueEmail('dup'),
      testUser.password,
    );
    await registerPage.expectRegistrationError();
  });

  test('should disable submit button when fields are empty', async ({ registerPage }) => {
    await registerPage.goto();
    await expect(registerPage.submitButton).toBeDisabled();
    await expect(registerPage.page).toHaveURL(/\/register/);
  });

  test('should have a link to login page', async ({ registerPage }) => {
    await registerPage.goto();
    await expect(registerPage.loginLink).toBeVisible();
  });
});

test.describe('User Registration @api', () => {
  test('should register a new user via API', async () => {
    const user = TestDataHelper.uniqueUser();
    const client = new ApiClient();
    const authApi = new AuthApi(client);

    const response = await authApi.register({
      username: user.username,
      email: user.email,
      password: user.password,
    });

    expect(response.status).toBe(200);
    await client.dispose();
  });

  test('should fail to register with duplicate username via API', async () => {
    const { testUser } = readState();
    const client = new ApiClient();
    const authApi = new AuthApi(client);

    const response = await authApi.register({
      username: testUser.username,
      email: TestDataHelper.uniqueEmail('dup'),
      password: testUser.password,
    });

    expect(response.status).not.toBe(200);
    await client.dispose();
  });
});
