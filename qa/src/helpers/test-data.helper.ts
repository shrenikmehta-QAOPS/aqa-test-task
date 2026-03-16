import { randomBytes } from 'crypto';

export class TestDataHelper {
  static randomSuffix(length = 6): string {
    return randomBytes(length).toString('hex').slice(0, length);
  }

  static uniqueUsername(prefix = 'testuser'): string {
    return `${prefix}_${this.randomSuffix()}`;
  }

  static uniqueEmail(prefix = 'testuser'): string {
    return `${prefix}_${this.randomSuffix()}@test.local`;
  }

  static testPassword(): string {
    return `TestP@ss_${this.randomSuffix(8)}`;
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
    return {
      username: `testuser_${suffix}`,
      email: `testuser_${suffix}@test.local`,
      password: `TestP@ss_${this.randomSuffix(8)}`,
    };
  }
}
