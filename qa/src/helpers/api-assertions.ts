import { expect, type APIResponse } from '@playwright/test';
import { HttpStatus } from '../constants/http';

function formatBody(data: unknown): string {
  if (data === undefined || data === null) return '(no body)';
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

/**
 * Asserts HTTP status is exactly `expected` with a failure message that includes a safe response body snippet.
 */
export function expectHttpStatus(
  actual: number,
  expected: number,
  operation: string,
  body?: unknown,
): void {
  expect(
    actual,
    `${operation}: expected HTTP ${expected}, received ${actual}.\n${formatBody(body)}`,
  ).toBe(expected);
}

/**
 * Asserts status is one of `allowed` (e.g. 200 vs 201 for create endpoints).
 */
export function expectHttpStatusOneOf(
  actual: number,
  allowed: readonly number[],
  operation: string,
  body?: unknown,
): void {
  expect(
    allowed.includes(actual),
    `${operation}: expected one of [${allowed.join(', ')}], received ${actual}.\n${formatBody(body)}`,
  ).toBeTruthy();
}

/** Auth: successful login should be 200 with a non-empty bearer token. */
export function expectLoginSuccessResponse(
  status: number,
  body: { token?: string } | null,
  operation = 'POST /login',
): void {
  expectHttpStatus(status, HttpStatus.OK, operation, body);
  expect(body?.token, `${operation}: response must include "token"`).toBeTruthy();
  expect(String(body!.token).length, `${operation}: token must be non-empty`).toBeGreaterThan(0);
}

/** Auth: failed login must not succeed and should surface as a client error (4xx). */
export function expectAuthFailureStatus(
  status: number,
  body: unknown,
  operation = 'POST /login (negative)',
): void {
  expect(
    status >= 400 && status < 500,
    `${operation}: expected 4xx for invalid credentials (commonly ${HttpStatus.UNAUTHORIZED}), received ${status}.\n${formatBody(
      body,
    )}`,
  ).toBeTruthy();
}

/** Register / validation failures: must not succeed and should be a client error. */
export function expectClientError(
  status: number,
  operation: string,
  body?: unknown,
): void {
  expect(
    status >= 400 && status < 500,
    `${operation}: expected 4xx, received ${status}.\n${formatBody(body)}`,
  ).toBeTruthy();
}

/**
 * After deleting a resource, GET may return 404 (not found) or 403 (forbidden) depending on API semantics.
 * 500 is treated as a failure to surface server bugs.
 */
export function expectDeletedResourceInaccessible(
  status: number,
  body: unknown,
  operation = 'GET deleted resource',
): void {
  expect(
    status === HttpStatus.NOT_FOUND || status === HttpStatus.FORBIDDEN,
    `${operation}: expected ${HttpStatus.NOT_FOUND} or ${HttpStatus.FORBIDDEN} after delete, received ${status}.\n${formatBody(
      body,
    )}`,
  ).toBeTruthy();
}

/** Optional: attach raw API response to the HTML report when debugging flaky API tests. */
export async function attachApiResponse(
  testInfo: { attach: (name: string, body: string, options?: { contentType?: string }) => Promise<void> },
  label: string,
  response: APIResponse,
): Promise<void> {
  let text = '';
  try {
    text = await response.text();
  } catch {
    text = '(could not read body)';
  }
  const summary = `HTTP ${response.status()} ${response.url()}\n\n${text}`;
  await testInfo.attach(`${label}-${response.status()}`, summary, { contentType: 'text/plain' });
}
