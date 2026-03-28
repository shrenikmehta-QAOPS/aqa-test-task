import type { TestInfo } from '@playwright/test';
import { redactSecrets } from './redact';

/**
 * Attach structured JSON to the Playwright report (secrets redacted).
 */
export async function attachJson(testInfo: TestInfo, name: string, data: unknown): Promise<void> {
  const safe = redactSecrets(data);
  await testInfo.attach(name, {
    body: JSON.stringify(safe, null, 2),
    contentType: 'application/json',
  });
}
