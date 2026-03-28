import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

function intEnv(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return defaultValue;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : defaultValue;
}

function trimOrDefault(value: string | undefined, fallback: string): string {
  const t = value?.trim();
  return t || fallback;
}

function normalizeApiUrl(url: string): string {
  return url.replace(/\/?$/, '/');
}

/**
 * Single source of truth for URLs, timeouts, and non-secret test defaults.
 * Override via environment variables (see `.env.example` in this folder).
 */
export const appConfig = {
  baseUrl: trimOrDefault(process.env.BASE_URL, 'http://localhost:8080'),
  apiUrl: normalizeApiUrl(trimOrDefault(process.env.API_URL, 'http://localhost:8080/api/v1')),
  timeouts: {
    /** Per-test timeout (Playwright `timeout`) */
    testMs: intEnv('PW_TEST_TIMEOUT_MS', 60_000),
    /** Default `expect()` timeout */
    expectMs: intEnv('PW_EXPECT_TIMEOUT_MS', 10_000),
    /** UI action timeout (click, fill) */
    actionMs: intEnv('PW_ACTION_TIMEOUT_MS', 15_000),
    /** `page.goto` and similar */
    navigationMs: intEnv('PW_NAVIGATION_TIMEOUT_MS', 30_000),
    /** After login/register success redirect */
    postAuthRedirectMs: intEnv('PW_POST_AUTH_REDIRECT_MS', 15_000),
    /** Error banner / validation message visibility */
    errorBannerMs: intEnv('PW_ERROR_BANNER_MS', 5_000),
    /** Backoff when API returns 429 (api-client + global setup) */
    rateLimitBackoffMs: intEnv('API_RATE_LIMIT_BACKOFF_MS', 12_000),
    globalSetupRateLimitMs: intEnv('GLOBAL_SETUP_RATE_LIMIT_MS', 10_000),
  },
  testData: {
    emailDomain: trimOrDefault(process.env.TEST_EMAIL_DOMAIN, 'test.local'),
    usernamePrefix: trimOrDefault(process.env.TEST_USERNAME_PREFIX, 'test'),
  },
  reporting: {
    jsonReportFile: trimOrDefault(process.env.PW_JSON_REPORT_FILE, 'test-results/results.json'),
    junitReportFile: trimOrDefault(process.env.PW_JUNIT_REPORT_FILE, 'test-results/junit.xml'),
  },
  ci: !!process.env.CI,
} as const;

export type AppConfig = typeof appConfig;
