import { randomBytes } from 'crypto';
import { appConfig } from '../config/app.config';

export class TestDataHelper {
  static randomSuffix(length = 6): string {
    return randomBytes(Math.max(1, length)).toString('hex').slice(0, length);
  }

  static uniqueUsername(prefix?: string): string {
    const p = prefix ?? appConfig.testData.usernamePrefix;
    return `${p}_${this.randomSuffix()}`;
  }

  static uniqueEmail(prefix?: string): string {
    const p = prefix ?? appConfig.testData.usernamePrefix;
    return `${p}_${this.randomSuffix()}@${appConfig.testData.emailDomain}`;
  }

  static testPassword(): string {
    return `TestP@ss_${this.randomSuffix(8)}`;
  }

  /** Guaranteed not to match a real user password (for negative login tests). */
  static wrongPassword(): string {
    return `Wrong_${this.randomSuffix(12)}!`;
  }

  /** Username that should not exist (cryptographic suffix, avoids guessable strings in tests). */
  static nonexistentUsername(): string {
    return `phantom_${this.randomSuffix(16)}`;
  }

  static uniqueProjectTitle(prefix = 'Test Project'): string {
    return `${prefix} ${this.randomSuffix()}`;
  }

  static uniqueTaskTitle(prefix = 'Test Task'): string {
    return `${prefix} ${this.randomSuffix()}`;
  }

  static uniqueTeamName(prefix = 'Test Team'): string {
    return `${prefix} ${this.randomSuffix()}`;
  }

  static uniqueUser() {
    const suffix = this.randomSuffix();
    const domain = appConfig.testData.emailDomain;
    const base = appConfig.testData.usernamePrefix;
    return {
      username: `${base}_${suffix}`,
      email: `${base}_${suffix}@${domain}`,
      password: this.testPassword(),
    };
  }
}
