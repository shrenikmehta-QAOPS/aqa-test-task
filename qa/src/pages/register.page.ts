import { Page, Locator, expect } from '@playwright/test';
import { appConfig } from '../config/app.config';
import { BasePage } from './base.page';

export class RegisterPage extends BasePage {
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.locator('#username');
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('#register-submit, button[id="register-submit"], .button.is-primary, button[type="submit"], button[type="button"].is-primary');
    this.loginLink = page.locator('a[href*="login"]');
    this.errorMessage = page.locator('.notification.is-danger, .message.is-danger, p.help.is-danger, [class*="error"], [class*="danger"]');
  }

  async goto(): Promise<void> {
    await this.navigateTo('/register');
  }

  async register(username: string, email: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await expect(this.submitButton).toBeEnabled({ timeout: appConfig.timeouts.errorBannerMs });
    await this.submitButton.click();
  }

  async expectRegistrationSuccess(): Promise<void> {
    await this.page.waitForURL((url) => !url.pathname.includes('/register'), {
      timeout: appConfig.timeouts.postAuthRedirectMs,
    });
  }

  async expectRegistrationError(): Promise<void> {
    await expect(this.errorMessage.first()).toBeVisible({ timeout: appConfig.timeouts.errorBannerMs });
  }
}
