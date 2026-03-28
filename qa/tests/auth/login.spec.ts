import { test, expect } from '../../src/fixtures/test.fixture';
import { readState } from '../../src/global-setup';
import { TestDataHelper } from '../../src/helpers/test-data.helper';
import {
  expectAuthFailureStatus,
  expectLoginSuccessResponse,
} from '../../src/helpers/api-assertions';

test.describe('User Login — UI', () => {
  test('should login with valid credentials', { tag: ['@smoke', '@regression', '@ui'] }, async ({
    loginPage,
  }) => {
    const { testUser } = readState();
    await loginPage.goto();
    await loginPage.login(testUser.username, testUser.password);
    await loginPage.expectLoginSuccess();
  });

  const negativeUiCases = [
    {
      name: 'invalid password',
      build: (seed: ReturnType<typeof readState>['testUser']) => ({
        username: seed.username,
        password: TestDataHelper.wrongPassword(),
      }),
    },
    {
      name: 'non-existent user',
      build: () => ({
        username: TestDataHelper.nonexistentUsername(),
        password: TestDataHelper.wrongPassword(),
      }),
    },
  ] as const;

  for (const scenario of negativeUiCases) {
    test(`should show error — ${scenario.name}`, { tag: ['@regression', '@ui'] }, async ({
      loginPage,
    }) => {
      const { testUser } = readState();
      const creds = scenario.build(testUser);
      await loginPage.goto();
      await loginPage.login(creds.username, creds.password);
      await loginPage.expectLoginError();
    });
  }

  test('should expose navigation to register', { tag: ['@regression', '@ui'] }, async ({
    loginPage,
  }) => {
    await loginPage.goto();
    await expect(loginPage.registerLink).toBeVisible();
  });

  test('should navigate to register via link', { tag: ['@regression', '@ui'] }, async ({
    loginPage,
  }) => {
    await loginPage.goto();
    await loginPage.goToRegister();
    await expect(loginPage.page).toHaveURL(/\/register/);
  });
});

test.describe('User Login — API', () => {
  test('should return a token for valid credentials', { tag: ['@smoke', '@regression', '@api'] }, async ({
    authApi,
  }) => {
    const { testUser } = readState();
    const response = await authApi.login({
      username: testUser.username,
      password: testUser.password,
    });

    expectLoginSuccessResponse(response.status, response.data, 'POST /login (seeded user)');
  });

  test('should reject login with wrong password', { tag: ['@regression', '@api'] }, async ({ authApi }) => {
    const { testUser } = readState();
    const response = await authApi.login({
      username: testUser.username,
      password: TestDataHelper.wrongPassword(),
    });

    expectAuthFailureStatus(response.status, response.data, 'POST /login (wrong password)');
  });
});
