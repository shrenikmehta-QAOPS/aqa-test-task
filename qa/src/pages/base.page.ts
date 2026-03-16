import { Page, Locator } from '@playwright/test';

export class BasePage {
  constructor(public readonly page: Page) {}

  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'networkidle' });
  }

  async waitForURL(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(urlPattern, { timeout: 15_000 });
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
