import { test as base } from '@playwright/test';
import { ApiClient } from '../api/api-client';
import { AuthApi } from '../api/auth.api';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';

interface TestFixtures {
  apiClient: ApiClient;
  authApi: AuthApi;
  loginPage: LoginPage;
  registerPage: RegisterPage;
}

export const test = base.extend<TestFixtures>({
  apiClient: async ({}, use) => {
    const client = new ApiClient();
    await use(client);
    await client.dispose();
  },

  authApi: async ({ apiClient }, use) => {
    await use(new AuthApi(apiClient));
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
});

export { expect } from '@playwright/test';
