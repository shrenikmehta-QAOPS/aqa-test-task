import { Page, Locator, expect } from '@playwright/test';
import { appConfig } from '../config/app.config';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly registerLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('button[type="submit"], .button.is-primary, [data-cy="login-submit"]');
    this.registerLink = page.locator('a[href*="register"]');
    this.errorMessage = page.locator('.notification.is-danger, .message.is-danger, [class*="error"], [class*="danger"]');
  }

  async goto(): Promise<void> {
    await this.navigateTo('/login');
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectLoginSuccess(): Promise<void> {
    await this.page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: appConfig.timeouts.postAuthRedirectMs,
    });
  }

  async expectLoginError(): Promise<void> {
    await expect(this.errorMessage.first()).toBeVisible({ timeout: appConfig.timeouts.errorBannerMs });
  }

  async goToRegister(): Promise<void> {
    await this.registerLink.click();
    await this.page.waitForURL(/\/register/, { timeout: appConfig.timeouts.postAuthRedirectMs });
  }
}
