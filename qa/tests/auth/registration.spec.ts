import { test, expect } from '../../src/fixtures/test.fixture';
import { readState } from '../../src/global-setup';
import { TestDataHelper } from '../../src/helpers/test-data.helper';
import { expectClientError, expectHttpStatus } from '../../src/helpers/api-assertions';
import { HttpStatus } from '../../src/constants/http';
import { appConfig } from '../../src/config/app.config';

test.describe('User Registration — UI', () => {
  test('should register a new user successfully', { tag: ['@smoke', '@regression', '@ui'] }, async ({
    registerPage,
  }) => {
    const user = TestDataHelper.uniqueUser();
    await registerPage.goto();
    await registerPage.register(user.username, user.email, user.password);
    await registerPage.expectRegistrationSuccess();
  });

  test('should reject duplicate username', { tag: ['@regression', '@ui'] }, async ({ registerPage }) => {
    const { testUser } = readState();
    await registerPage.goto();
    await registerPage.register(
      testUser.username,
      TestDataHelper.uniqueEmail('dup'),
      testUser.password,
    );
    await registerPage.expectRegistrationError();
  });

  test('should keep submit disabled when fields are empty', { tag: ['@regression', '@ui'] }, async ({
    registerPage,
  }) => {
    await registerPage.goto();
    await expect(registerPage.submitButton).toBeDisabled();
    await expect(registerPage.page).toHaveURL(/\/register/);
  });

  test('should expose navigation to login', { tag: ['@regression', '@ui'] }, async ({ registerPage }) => {
    await registerPage.goto();
    await expect(registerPage.loginLink).toBeVisible();
  });
});

test.describe('User Registration — API', () => {
  test.beforeAll(async () => {
    await new Promise((r) => setTimeout(r, appConfig.timeouts.rateLimitBackoffMs));
  });

  test('should register a new user', { tag: ['@smoke', '@regression', '@api'] }, async ({ authApi }) => {
    const user = TestDataHelper.uniqueUser();
    const response = await authApi.register({
      username: user.username,
      email: user.email,
      password: user.password,
    });

    expectHttpStatus(
      response.status,
      HttpStatus.OK,
      'POST /register (new user)',
      response.data,
    );
  });

  test('should reject duplicate username', { tag: ['@regression', '@api'] }, async ({ authApi }) => {
    const { testUser } = readState();
    const response = await authApi.register({
      username: testUser.username,
      email: TestDataHelper.uniqueEmail('dup'),
      password: testUser.password,
    });

    expectClientError(response.status, 'POST /register (duplicate username)', response.data);
  });
});
