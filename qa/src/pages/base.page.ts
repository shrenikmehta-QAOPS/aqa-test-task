import { Page, Locator } from '@playwright/test';
import { appConfig } from '../config/app.config';

export class BasePage {
  constructor(public readonly page: Page) {}

  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path, {
      waitUntil: 'networkidle',
      timeout: appConfig.timeouts.navigationMs,
    });
  }

  async waitForURL(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(urlPattern, { timeout: appConfig.timeouts.postAuthRedirectMs });
  }

  getCurrentURL(): string {
    return this.page.url();
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async clickButtonByText(text: string): Promise<void> {
    await this.page.getByRole('button', { name: text }).click();
  }

  getNotification(): Locator {
    return this.page.locator('.notification, [class*="message"], [role="alert"]');
  }
}
