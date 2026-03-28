# Framework Architecture & Design Documentation

This document explains every file in the QA framework, the logic behind each piece of code, why specific design decisions were made, and why alternative approaches were not used.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Execution Flow](#2-execution-flow)
3. [File-by-File Breakdown](#3-file-by-file-breakdown)
   - [playwright.config.ts](#playwrightconfigts)
   - [tsconfig.json](#tsconfigjson)
   - [package.json](#packagejson)
   - [.env / .env.example](#env--envexample)
   - [.gitignore](#gitignore)
   - [src/config/app.config.ts](#srcconfigappconfigts)
   - [src/constants/http.ts](#srcconstantshttpts)
   - [src/types/index.ts](#srctypesindexts)
   - [src/api/api-client.ts](#srcapiapi-clientts)
   - [src/api/auth.api.ts](#srcapiauthapits)
   - [src/api/projects.api.ts](#srcapiprojectsapits)
   - [src/api/tasks.api.ts](#srcapitasksapits)
   - [src/pages/base.page.ts](#srcpagesbasepagts)
   - [src/pages/login.page.ts](#srcpagesloginpagets)
   - [src/pages/register.page.ts](#srcpagesregisterpagts)
   - [src/fixtures/test.fixture.ts](#srcfixturestestfixturets)
   - [src/global-setup.ts](#srcglobal-setupts)
   - [src/helpers/test-data.helper.ts](#srchelperstest-datahelperst)
   - [src/helpers/redact.ts](#srchelpersredactts)
   - [src/helpers/test-context.ts](#srchelperstest-contextts)
   - [src/helpers/api-assertions.ts](#srchelpersapi-assertionsts)
4. [Test Files](#4-test-files)
   - [tests/auth/login.spec.ts](#testsauthloginspects)
   - [tests/auth/registration.spec.ts](#testsauthregistrationspects)
   - [tests/tasks/tasks-crud.spec.ts](#teststaskstasks-crudspects)
5. [Design Decisions & Alternatives](#5-design-decisions--alternatives)

---

## 1. High-Level Architecture

The framework follows a **layered architecture** where each layer has a single responsibility:

```
┌─────────────────────────────────────────────────┐
│                  Test Specs                      │
│   (login.spec.ts, registration.spec.ts,         │
│    tasks-crud.spec.ts)                           │
│   Role: Orchestrate scenarios, assert outcomes   │
├─────────────────────────────────────────────────┤
│              Fixtures Layer                      │
│   (test.fixture.ts)                              │
│   Role: Inject page objects + API clients         │
├──────────────────────┬──────────────────────────┤
│    Page Objects       │     API Layer             │
│  (base.page.ts,      │  (api-client.ts,          │
│   login.page.ts,     │   auth.api.ts,            │
│   register.page.ts)  │   projects.api.ts,        │
│  Role: UI abstraction │   tasks.api.ts)           │
│                       │  Role: HTTP abstraction    │
├──────────────────────┴──────────────────────────┤
│              Helpers Layer                        │
│   (test-data.helper.ts, api-assertions.ts,       │
│    redact.ts, test-context.ts)                   │
│   Role: Data generation, assertions, safety       │
├─────────────────────────────────────────────────┤
│         Config + Constants Layer                 │
│   (app.config.ts, http.ts)                       │
│   Role: Single source of truth for all settings   │
├─────────────────────────────────────────────────┤
│             Types Layer                          │
│   (types/index.ts)                               │
│   Role: TypeScript interfaces for API contracts   │
└─────────────────────────────────────────────────┘
```

**Why this structure?**
- Test specs stay clean — they only orchestrate scenarios, never construct HTTP requests or manipulate DOM directly.
- Changing a UI selector only requires editing one page object.
- Changing an API endpoint only requires editing one API class.
- Changing a timeout or URL only requires editing `app.config.ts` (or the `.env` file).

**Why not a flat structure?**
A flat structure (all files in one folder) becomes unmanageable past 10-15 files. Grouping by responsibility (config, api, pages, helpers, tests) makes it immediately clear where to find and change things.

---

## 2. Execution Flow

Here is what happens when you run `npm test`:

```
1. Playwright reads playwright.config.ts
   └── playwright.config.ts imports appConfig from src/config/app.config.ts
       └── app.config.ts loads .env via dotenv
       └── app.config.ts reads process.env for all values (URLs, timeouts, etc.)

2. Playwright runs globalSetup (src/global-setup.ts)
   └── Creates a Playwright API request context pointed at appConfig.apiUrl
   └── Generates a unique test user via TestDataHelper
   └── Registers that user via POST /register
   └── Writes credentials to .test-state.json on disk
   └── Disposes the request context

3. Playwright discovers test files under tests/
   └── Each spec imports test/expect from src/fixtures/test.fixture.ts
       └── Fixtures create and inject: apiClient, authApi, loginPage, registerPage

4. Each test runs:
   └── Reads .test-state.json via readState() to get the seeded user
   └── Uses page objects (UI) or API helpers (API) to perform actions
   └── Uses assertion helpers to validate outcomes
   └── On failure: attaches redacted JSON, screenshots, videos, traces

5. Playwright generates reports (list, HTML, JSON; JUnit if CI=true)
```

---

## 3. File-by-File Breakdown

---

### `playwright.config.ts`

**What it does:** Configures Playwright Test runner — timeouts, reporters, browser, artifacts.

**Code logic explained:**

```typescript
const reporters: ReporterDescription[] = [
  ['list'],                                                    // Console output
  ['html', { open: 'never' }],                                // HTML report (don't auto-open)
  ['json', { outputFile: appConfig.reporting.jsonReportFile }], // Machine-readable JSON
];
if (appConfig.ci) {
  reporters.push(['junit', { outputFile: appConfig.reporting.junitReportFile }]);
}
```
Reporters are built as an array so we can conditionally add JUnit only in CI. JUnit is skipped locally because developers don't need it — it's for CI dashboards (Jenkins, GitHub Actions).

```typescript
globalSetup: './src/global-setup.ts',
```
Runs once before all tests to seed a user. This avoids each test registering its own user, which would hit the API with duplicate registrations and slow down the suite.

```typescript
fullyParallel: false,
workers: 1,
```
Sequential execution because the application under test (Vikunja) has rate limiting. Parallel workers would trigger 429 errors. If the app had no rate limiting, we would use `fullyParallel: true` and `workers: undefined` (auto-detect CPU count).

```typescript
timeout: appConfig.timeouts.testMs,
expect: { timeout: appConfig.timeouts.expectMs },
use: {
  baseURL: appConfig.baseUrl,
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  actionTimeout: appConfig.timeouts.actionMs,
  navigationTimeout: appConfig.timeouts.navigationMs,
},
```
Every timeout comes from `appConfig` (which reads from env vars). This means you can adjust all timeouts for a slow CI server by changing `.env` — no code changes needed.

- `trace: 'on-first-retry'` — Traces are expensive (large files). Recording on every test wastes disk space. Recording only on first retry captures the reproduction of a flaky failure.
- `screenshot: 'only-on-failure'` — Screenshots on success are noise. On failure, they show exactly what the page looked like.
- `video: 'retain-on-failure'` — Videos are recorded but deleted on success. Only kept when a test fails for debugging.

**Why not `trace: 'on'`?** It would generate hundreds of megabytes of trace files for a passing suite — wasteful and slow.

**Why not `retries: 2` always?** Retries mask real bugs during local development. Only CI gets retries (`appConfig.ci ? 2 : 0`) because CI environments are more prone to transient failures.

---

### `tsconfig.json`

**What it does:** Configures the TypeScript compiler.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "paths": {
      "@pages/*": ["src/pages/*"],
      "@api/*": ["src/api/*"],
      ...
    }
  }
}
```

- `target: ES2022` — Allows modern syntax (optional chaining, nullish coalescing, top-level await). ES2022 is safe because Node 18+ supports it natively.
- `module: commonjs` — Playwright's test runner expects CommonJS. Using ESM would require additional configuration (`"type": "module"` in package.json, different import syntax).
- `strict: true` — Catches null/undefined errors at compile time rather than at runtime during test execution.
- `paths` — Alias mappings like `@pages/*` for cleaner imports. Currently tests use relative paths, but the aliases are available for future use.

**Why CommonJS instead of ESM?** Playwright's TypeScript loader works seamlessly with CommonJS. ESM requires extra setup (`--experimental-vm-modules`, `.mts` extensions) and breaks some Playwright features.

---

### `package.json`

**What it does:** Declares dependencies and npm scripts.

```json
"scripts": {
  "test": "npx playwright test",
  "test:smoke": "npx playwright test --grep @smoke",
  "test:regression": "npx playwright test --grep @regression",
  "test:ui": "npx playwright test --grep @ui",
  "test:api": "npx playwright test --grep @api",
  "test:auth": "npx playwright test tests/auth/",
  "test:tasks": "npx playwright test tests/tasks/",
  "test:headed": "npx playwright test --headed",
  "test:debug": "npx playwright test --debug",
  "report": "npx playwright show-report",
  "lint": "npx tsc --noEmit"
}
```

Two filtering strategies are provided:
1. **By tag** (`--grep @smoke`) — Runs tests across all files that have a specific tag. Useful for CI pipelines that run smoke tests on every commit and regression tests nightly.
2. **By folder** (`tests/auth/`) — Runs all tests in a directory. Useful when working on a specific feature.

`lint` runs TypeScript compiler without emitting files — catches type errors before running tests.

**Why `devDependencies` only?** Test frameworks are development tools, not production dependencies. Using `devDependencies` prevents them from being installed in production deployments.

**Why `dotenv` as a dependency?** Node.js doesn't natively load `.env` files. The `dotenv` package reads `.env` and injects values into `process.env` before any config code runs.

---

### `.env` / `.env.example`

**`.env`** (git-ignored, not committed):
```
BASE_URL=http://localhost:8080
API_URL=http://localhost:8080/api/v1
```
The actual file used at runtime by `dotenv.config()` in `app.config.ts`.

**`.env.example`** (committed to git):
```
# Copy to .env and adjust. Never commit real credentials.
BASE_URL=http://localhost:8080
API_URL=http://localhost:8080/api/v1/
# PW_TEST_TIMEOUT_MS=60000
# ...
```
A template that documents every available environment variable with its default value. Commented-out lines show optional overrides.

**Why two files?**
- `.env` may contain sensitive values (staging URLs, API keys in future). It must never be committed.
- `.env.example` is a reference so that new developers know which variables exist without reading source code.

**Why not hardcode URLs in config?** If URLs were hardcoded, running tests against a staging or production server would require code changes. With env vars, you just change `.env` or pass them at the command line: `BASE_URL=https://staging.example.com npm test`.

---

### `.gitignore`

```
node_modules/     # Dependencies (installed via npm install)
dist/             # Compiled output (if tsc is run)
test-results/     # Playwright test artifacts
playwright-report/ # HTML report directory
blob-report/      # Playwright sharded report blobs
.env              # Environment variables (may contain secrets)
*.log             # Log files
.test-state.json  # Runtime-generated test credentials
```

Every entry is a generated file that should never be committed — either installed dependencies, build output, test artifacts, or runtime state.

---

### `src/config/app.config.ts`

**What it does:** The single source of truth for all configurable values in the framework.

**Code logic explained:**

```typescript
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });
```
Loads the `.env` file from the `qa/` root. Uses `path.resolve(__dirname, '../../.env')` because this file lives at `src/config/app.config.ts` — two directories up reaches `qa/.env`.

```typescript
function intEnv(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return defaultValue;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : defaultValue;
}
```
Safe integer parser for environment variables. Environment variables are always strings, so we must parse them. If the value is missing, empty, or not a valid number, it falls back to the default. This prevents `NaN` from propagating into timeouts (which would cause Playwright to hang or crash).

**Why `Number.isFinite(n)` instead of `!isNaN(n)`?** `isNaN` has quirks — `isNaN(null)` returns `false`, `isNaN('')` returns `false`. `Number.isFinite` is strictly correct: it only returns `true` for actual finite numbers.

```typescript
function trimOrDefault(value: string | undefined, fallback: string): string {
  const t = value?.trim();
  return t || fallback;
}
```
Trims whitespace from env values. Users sometimes accidentally add spaces in `.env` files (`BASE_URL = http://...`). Without trimming, the URL would have a leading space and all HTTP requests would fail.

```typescript
function normalizeApiUrl(url: string): string {
  return url.replace(/\/?$/, '/');
}
```
Ensures the API URL always ends with `/`. Without this, `http://localhost:8080/api/v1` + `register` would produce `http://localhost:8080/api/v1register` (missing slash). With the trailing slash, Playwright correctly resolves relative endpoints.

```typescript
export const appConfig = {
  baseUrl: trimOrDefault(process.env.BASE_URL, 'http://localhost:8080'),
  apiUrl: normalizeApiUrl(trimOrDefault(process.env.API_URL, 'http://localhost:8080/api/v1')),
  timeouts: { ... },
  testData: { ... },
  reporting: { ... },
  ci: !!process.env.CI,
} as const;
```

- `as const` makes the object deeply readonly. This prevents accidental mutation (e.g., a test accidentally doing `appConfig.timeouts.testMs = 5000`).
- `ci: !!process.env.CI` — Double negation converts any truthy value (`"true"`, `"1"`, `"yes"`) to boolean `true`, and `undefined` to `false`.

**Why a single config object instead of multiple files?** Having URLs in one file and timeouts in another creates confusion about where to look. A single `appConfig` object means one import gives you everything.

**Why not use Playwright's built-in env handling?** Playwright can read `baseURL` from the config, but it has no built-in mechanism for custom timeout env vars, test data defaults, or reporting paths. A centralized config gives us full control.

---

### `src/constants/http.ts`

**What it does:** Named constants for HTTP status codes.

```typescript
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;
```

**Why not use raw numbers?** `HttpStatus.NOT_FOUND` is self-documenting; `404` requires the reader to remember what it means. In assertions, `expectHttpStatus(response.status, HttpStatus.OK, ...)` reads like English compared to `expect(response.status).toBe(200)`.

**Why not use an enum?** TypeScript enums create runtime code and have edge cases with reverse mapping. A `const` object with `as const` gives the same type safety with zero runtime overhead.

**Why not use a library like `http-status-codes`?** Adding a dependency for 9 constants is overkill. The constants are unlikely to change (HTTP is a stable protocol), so maintaining them manually is trivial.

---

### `src/types/index.ts`

**What it does:** TypeScript interfaces that mirror the Vikunja API request/response shapes.

```typescript
export interface LoginRequest {
  username: string;
  password: string;
  long_token?: boolean;
}

export interface LoginResponse {
  token?: string;
  message?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  is_archived: boolean;
  created: string;
  updated: string;
}

export interface ProjectPayload { ... }
export interface Task { ... }
export interface TaskPayload { ... }
```

**Why separate Request/Response and Entity/Payload types?**
- `LoginRequest` is what we **send** to the API (username + password).
- `LoginResponse` is what the API **returns** (token).
- `Project` is the full entity (with `id`, `created`, `updated` — server-generated fields).
- `ProjectPayload` is what we send to create/update (no `id`, no timestamps).

This separation prevents accidentally sending an `id` in a create request or expecting a `token` in a register response.

**Why not auto-generate types from the API?** Vikunja's API doesn't publish an OpenAPI spec in a format suitable for code generation. Manually maintaining 6 small interfaces is manageable.

---

### `src/api/api-client.ts`

**What it does:** A generic HTTP client wrapper around Playwright's `APIRequestContext` with JWT management and rate-limit retry.

**Code logic explained:**

```typescript
private token: string | null = null;
private context: APIRequestContext | null = null;

constructor(private readonly baseUrl: string = appConfig.apiUrl) {}
```
Lazy initialization — the context is not created until the first HTTP call. The `baseUrl` defaults to `appConfig.apiUrl` so tests don't need to pass it.

```typescript
setToken(token: string): void {
  if (this.token === token) return;
  this.token = token;
  if (this.context) {
    this.context.dispose().catch(() => {});
    this.context = null;
  }
}
```
When a token is set (after login), the existing context is disposed and nulled. This forces `getContext()` to create a new context with the `Authorization: Bearer <token>` header on the next call.

**Why dispose and recreate instead of updating headers?** Playwright's `APIRequestContext` is immutable after creation — you cannot change `extraHTTPHeaders` on an existing context. The only way to add the auth header is to create a new context.

**Why `this.context.dispose().catch(() => {})`?** Disposing can fail if the context was already disposed or the browser closed. Swallowing the error prevents unhandled rejections that would crash the test runner.

```typescript
private async executeWithRetry<T>(
  fn: (ctx: APIRequestContext) => Promise<APIResponse>,
): Promise<{ status: number; data: T }> {
  const ctx = await this.getContext();
  let response = await fn(ctx);

  if (response.status() === 429) {
    await new Promise((r) => setTimeout(r, appConfig.timeouts.rateLimitBackoffMs));
    response = await fn(ctx);
  }

  const data = await response.json().catch(() => null);
  return { status: response.status(), data: data as T };
}
```

This is the core method. Every HTTP call goes through it:

1. Gets (or creates) the request context.
2. Executes the HTTP call.
3. If 429 (rate limited), waits for `rateLimitBackoffMs` (default 12 seconds) and retries **once**.
4. Parses the JSON body. If parsing fails (non-JSON response), returns `null`.
5. Returns a simple `{ status, data }` object.

**Why only one retry?** Vikunja's rate limiter resets after a short window. One retry after a 12-second wait is sufficient. Multiple retries with exponential backoff would be appropriate for a production API client but add complexity unnecessary for a test framework.

**Why `response.json().catch(() => null)`?** Some endpoints (like DELETE) may return empty bodies or non-JSON responses. Without the catch, the test would crash with a JSON parse error instead of allowing the assertion to report the actual problem.

**Why return `{ status, data }` instead of throwing on non-2xx?** Tests need to assert on error responses (e.g., "login with wrong password should return 401"). If the client threw on 4xx, negative tests would need try/catch everywhere — much less readable than `expect(response.status).toBe(401)`.

```typescript
async dispose(): Promise<void> {
  if (this.context) {
    await this.context.dispose();
    this.context = null;
  }
}
```
Cleanup method. Called in fixtures (`afterEach`) and `test.afterAll` to release Playwright's HTTP connections.

---

### `src/api/auth.api.ts`

**What it does:** Domain-specific API helper for authentication endpoints.

```typescript
async login(data: LoginRequest): Promise<{ status: number; data: LoginResponse }> {
  const response = await this.client.post<LoginResponse>('login', data as unknown as Record<string, unknown>);
  if (response.status === 200 && response.data?.token) {
    this.client.setToken(response.data.token);
  }
  return response;
}
```

**Key behavior:** On successful login (200 + token present), it automatically sets the token on the `ApiClient`. This means after calling `authApi.login(...)`, all subsequent API calls through the same `apiClient` are authenticated — no manual token handling in tests.

**Why `data as unknown as Record<string, unknown>`?** TypeScript's `post` method expects `Record<string, unknown>` (generic object), but `LoginRequest` is a typed interface. The double cast is a type-narrowing workaround that preserves type safety at the call site while satisfying the generic constraint.

```typescript
async registerAndLogin(username, email, password): Promise<ApiClient> {
  await this.register({ username, email, password });
  await this.login({ username, password });
  return this.client;
}
```
Convenience method that combines registration + login in one call. Returns the authenticated client so callers can chain API operations.

**Why not call the API directly in tests?** Without `AuthApi`, every test would need to:
1. Construct the request body manually.
2. Call `apiClient.post('login', { ... })`.
3. Extract the token from the response.
4. Call `apiClient.setToken(token)`.

With `AuthApi`, it's one line: `await authApi.login({ username, password })`.

---

### `src/api/projects.api.ts`

**What it does:** CRUD operations for Vikunja projects.

```typescript
async create(payload: ProjectPayload): Promise<{ status: number; data: Project }> {
  return this.client.put<Project>('projects', payload as unknown as Record<string, unknown>);
}
```

**Why PUT for create?** Vikunja's API uses `PUT` to create new resources (non-standard). Most REST APIs use `POST` for creation. The API wrapper matches Vikunja's actual behavior rather than REST conventions.

**Why does this file exist if tests don't test projects directly?** Tasks CRUD tests need a project as a container (every task belongs to a project). `ProjectsApi.create()` is used in `test.beforeAll` to set up the project. Having it as a separate class also makes it ready if projects CRUD tests are added later.

---

### `src/api/tasks.api.ts`

**What it does:** CRUD operations for Vikunja tasks.

```typescript
async create(projectId: number, payload: TaskPayload): Promise<{ status: number; data: Task }> {
  return this.client.put<Task>(
    `projects/${projectId}/tasks`,
    payload as unknown as Record<string, unknown>,
  );
}
```
Task creation requires a `projectId` because tasks are nested under projects in Vikunja's API (`PUT /projects/:id/tasks`).

```typescript
async update(id: number, payload: Partial<TaskPayload>): Promise<{ status: number; data: Task }> {
  return this.client.post<Task>(`tasks/${id}`, payload as unknown as Record<string, unknown>);
}
```
Uses `Partial<TaskPayload>` so you can update just one field (e.g., only the title) without providing all fields.

```typescript
async setDone(id: number, done: boolean): Promise<{ status: number; data: Task }> {
  return this.update(id, { done });
}
```
Convenience method that wraps `update` for the common case of marking a task done/undone.

---

### `src/pages/base.page.ts`

**What it does:** Base class for all page objects with shared navigation and utility methods.

```typescript
export class BasePage {
  constructor(public readonly page: Page) {}

  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path, {
      waitUntil: 'networkidle',
      timeout: appConfig.timeouts.navigationMs,
    });
  }
```

**Why `waitUntil: 'networkidle'`?** Vikunja is a single-page application (SPA). After `page.goto()`, the page loads a shell and then fetches data via API calls. `networkidle` waits until there are no network requests for 500ms, ensuring the page is fully loaded before tests interact with it.

**Why not `waitUntil: 'domcontentloaded'`?** DOM content loads quickly, but the SPA's JavaScript may still be fetching data. Tests would interact with elements that haven't been populated yet, causing flaky failures.

**Why `public readonly page`?** Page objects need to expose `page` so tests can use `expect(loginPage.page).toHaveURL(...)`. Making it `readonly` prevents accidental reassignment.

```typescript
getNotification(): Locator {
  return this.page.locator('.notification, [class*="message"], [role="alert"]');
}
```
Uses a CSS selector list (comma-separated) to match multiple possible notification elements. Vikunja uses Bulma CSS framework, which has several notification patterns. The selector covers all of them.

---

### `src/pages/login.page.ts`

**What it does:** Page object for the login page (`/login`).

```typescript
constructor(page: Page) {
  super(page);
  this.usernameInput = page.locator('#username');
  this.passwordInput = page.locator('#password');
  this.submitButton = page.locator('button[type="submit"], .button.is-primary, [data-cy="login-submit"]');
  this.registerLink = page.locator('a[href*="register"]');
  this.errorMessage = page.locator('.notification.is-danger, .message.is-danger, [class*="error"], [class*="danger"]');
}
```

**Why multiple selectors with commas?** The Vikunja UI may render slightly differently across versions. Using fallback selectors (`button[type="submit"], .button.is-primary, [data-cy="login-submit"]`) ensures the locator works even if the primary selector doesn't match. Playwright tries each selector in the list and uses the first match.

**Why `#username` and `#password` (ID selectors)?** ID selectors are the most stable and performant locators. They don't change with CSS refactors or content changes.

```typescript
async expectLoginSuccess(): Promise<void> {
  await this.page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: appConfig.timeouts.postAuthRedirectMs,
  });
}
```
After a successful login, Vikunja redirects away from `/login`. Instead of checking for a specific URL (which might change), this checks that we've **left** the login page. This is more resilient — it works regardless of whether the redirect goes to `/`, `/dashboard`, or `/projects`.

```typescript
async expectLoginError(): Promise<void> {
  await expect(this.errorMessage.first()).toBeVisible({ timeout: appConfig.timeouts.errorBannerMs });
}
```
Uses `.first()` because multiple error elements might match the selector. We only need to verify that at least one error is visible. The timeout is shorter (`errorBannerMs = 5s`) because error messages appear faster than page redirects.

---

### `src/pages/register.page.ts`

**What it does:** Page object for the registration page (`/register`).

```typescript
async register(username: string, email: string, password: string): Promise<void> {
  await this.usernameInput.fill(username);
  await this.emailInput.fill(email);
  await this.passwordInput.fill(password);
  await expect(this.submitButton).toBeEnabled({ timeout: appConfig.timeouts.errorBannerMs });
  await this.submitButton.click();
}
```

**Why `expect(submitButton).toBeEnabled()` before clicking?** Vikunja's registration form disables the submit button until all fields are filled. After calling `.fill()`, the framework may try to click before the form's JavaScript re-enables the button. The explicit wait prevents a "button is disabled" error.

**Why not use `submitButton.waitFor({ state: 'enabled' })`?** Playwright's `waitFor` only supports `'attached'`, `'detached'`, `'visible'`, `'hidden'` states — not `'enabled'`. The `expect().toBeEnabled()` auto-retries until the condition is met, which is the correct Playwright pattern.

---

### `src/fixtures/test.fixture.ts`

**What it does:** Extends Playwright's `test` object with custom fixtures that inject ready-to-use objects into tests.

```typescript
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
```

**Why fixtures instead of creating objects in `beforeEach`?**
1. **Automatic cleanup.** The code after `await use(client)` runs as teardown — `client.dispose()` is guaranteed to run even if the test crashes.
2. **Dependency injection.** `authApi` depends on `apiClient`. Playwright resolves this automatically — it creates `apiClient` first, then passes it to `authApi`.
3. **Lazy creation.** If a test doesn't use `loginPage`, Playwright never creates it. With `beforeEach`, every object would be created for every test.

**Why `async ({}, use)` with empty braces?** This fixture has no dependencies on other fixtures. The empty `{}` is Playwright's syntax for "no dependencies".

**Why re-export `expect`?** Tests import `{ test, expect }` from the fixture file. If they imported `expect` from `@playwright/test` directly, it would work — but having a single import source makes it easier to add custom matchers later (by extending `expect` in the fixture file).

---

### `src/global-setup.ts`

**What it does:** Runs once before the entire test suite. Registers a test user and saves credentials to disk.

```typescript
export const STATE_FILE = path.resolve(__dirname, '..', '.test-state.json');
```
The state file is written to `qa/.test-state.json`. Listed in `.gitignore` because it contains generated credentials.

```typescript
function uniqueUser(prefix: string): UserCred {
  const suffix = TestDataHelper.randomSuffix();
  return {
    username: `${prefix}_${suffix}`,
    email: `${prefix}_${suffix}@${appConfig.testData.emailDomain}`,
    password: TestDataHelper.testPassword(),
  };
}
```
Generates a unique user with random suffix. Uses the same suffix for both username and email so they're visually correlated (e.g., `test_a3f2b1` / `test_a3f2b1@test.local`).

```typescript
async function registerUser(ctx, user): Promise<void> {
  const resp = await ctx.post('register', { data: { ... } });
  const status = resp.status();
  if (status === 429) {
    await new Promise((r) => setTimeout(r, appConfig.timeouts.globalSetupRateLimitMs));
    const retry = await ctx.post('register', { ... });
    if (retry.status() !== 200) {
      throw new Error(`Failed to register ${user.username}: ${retry.status()}`);
    }
  } else if (status !== 200) {
    throw new Error(`Failed to register ${user.username}: ${status}`);
  }
}
```
Handles rate limiting (429) with a single retry after a configurable delay. If registration fails even after retry, it throws — stopping the entire test suite immediately because all tests depend on this user.

**Why not use the `ApiClient` class here?** Global setup runs before Playwright's test context exists. The `ApiClient` class uses `request.newContext()` from `@playwright/test`, which works the same way, but global setup creates its own context directly to stay self-contained.

```typescript
export function readState(): SharedTestState {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as SharedTestState;
}
```
Synchronous file read. Tests call this to get the seeded user's credentials. It's synchronous (not async) because it reads from local disk — negligible latency.

**Why file-based state sharing instead of environment variables?** The state includes a randomly generated password that's only known at runtime. Writing to a file is simpler than dynamically setting env vars that child processes need to inherit.

**Why one shared user instead of per-test users?** Registering a user per test would:
1. Hit the API 15+ times for registration alone.
2. Trigger rate limiting.
3. Slow down the suite.

One shared user is sufficient because tests operate on different resources (uniquely-named tasks/projects).

---

### `src/helpers/test-data.helper.ts`

**What it does:** Factory class for generating unique, random test data.

```typescript
static randomSuffix(length = 6): string {
  return randomBytes(Math.max(1, length)).toString('hex').slice(0, length);
}
```
Uses Node's `crypto.randomBytes` for cryptographically random suffixes. This guarantees uniqueness even across parallel test runs (unlike `Date.now()` or `Math.random()` which can collide).

**Why `crypto.randomBytes` instead of `Math.random()`?** `Math.random()` is a PRNG with 2^52 bits of state. In a test suite that creates dozens of resources, collisions are unlikely but possible. `randomBytes` uses the OS's CSPRNG — collisions are practically impossible.

**Why `Math.max(1, length)`?** Prevents `randomBytes(0)` which would return an empty buffer. Defensive coding against accidental `randomSuffix(0)` calls.

```typescript
static testPassword(): string {
  return `TestP@ss_${this.randomSuffix(8)}`;
}
```
The prefix `TestP@ss_` satisfies common password requirements: uppercase, lowercase, number-like character, special character. The random suffix makes each password unique.

```typescript
static wrongPassword(): string {
  return `Wrong_${this.randomSuffix(12)}!`;
}
```
For negative tests. Uses a different prefix (`Wrong_`) and longer suffix (12 chars) to ensure it never accidentally matches a real password.

```typescript
static nonexistentUsername(): string {
  return `phantom_${this.randomSuffix(16)}`;
}
```
16-character random suffix makes it statistically impossible for this username to exist in the database. Used in "non-existent user" login tests.

**Why static methods instead of instance methods?** Test data generation is stateless — it doesn't need instance state. Static methods can be called without instantiation: `TestDataHelper.uniqueEmail()` instead of `new TestDataHelper().uniqueEmail()`.

**Why a class instead of plain functions?** Grouping related functions in a class provides namespace organization (`TestDataHelper.xxx`). It also makes IDE autocompletion more discoverable — typing `TestDataHelper.` shows all available generators.

---

### `src/helpers/redact.ts`

**What it does:** Deep-clones objects and replaces sensitive values with `[REDACTED]`.

```typescript
const SENSITIVE_KEYS = new Set([
  'password', 'token', 'authorization',
  'access_token', 'refresh_token', 'secret',
]);
```
A Set of lowercase key names considered sensitive. `Set.has()` is O(1) lookup — faster than array `.includes()` for repeated checks.

```typescript
export function redactSecrets<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item)) as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactSecrets(v);
      }
    }
    return out as T;
  }
  return value;
}
```

Recursive deep clone:
1. `null`/`undefined` — return as-is.
2. Arrays — map each element recursively.
3. Objects — iterate entries, redact sensitive keys, recurse into nested objects.
4. Primitives (string, number, boolean) — return as-is.

**Why deep clone instead of mutating?** Mutating the original would replace real passwords in the test's working data, breaking subsequent assertions that need the actual password.

**Why case-insensitive matching (`k.toLowerCase()`)?** APIs may return `Token`, `token`, or `TOKEN`. Case-insensitive matching catches all variants.

**Why not use a regex pattern?** A Set lookup is faster and more readable. Adding a new sensitive key is just adding one string to the Set.

---

### `src/helpers/test-context.ts`

**What it does:** Attaches structured JSON data to Playwright's HTML report with automatic redaction.

```typescript
export async function attachJson(testInfo: TestInfo, name: string, data: unknown): Promise<void> {
  const safe = redactSecrets(data);
  await testInfo.attach(name, {
    body: JSON.stringify(safe, null, 2),
    contentType: 'application/json',
  });
}
```

**Why a separate function instead of inline attachment?** Without this helper, every attachment in test code would need:
1. Import `redactSecrets`.
2. Call `redactSecrets(data)`.
3. Call `JSON.stringify(safe, null, 2)`.
4. Call `testInfo.attach(name, { body, contentType })`.

That's 4 lines every time. `attachJson` reduces it to 1 line and ensures redaction is never forgotten.

**Why `JSON.stringify(safe, null, 2)`?** Pretty-prints with 2-space indentation. In the HTML report, this makes JSON attachments human-readable.

---

### `src/helpers/api-assertions.ts`

**What it does:** Reusable assertion functions with descriptive failure messages.

```typescript
function formatBody(data: unknown): string {
  if (data === undefined || data === null) return '(no body)';
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}
```
Formats response bodies for inclusion in error messages. The try/catch handles circular references or non-serializable objects.

```typescript
export function expectHttpStatus(
  actual: number, expected: number, operation: string, body?: unknown,
): void {
  expect(
    actual,
    `${operation}: expected HTTP ${expected}, received ${actual}.\n${formatBody(body)}`,
  ).toBe(expected);
}
```

**Why custom assertion functions instead of raw `expect()`?**

Without helper — what a test failure looks like:
```
Expected: 200
Received: 401
```

With helper — what a test failure looks like:
```
POST /login (seeded user): expected HTTP 200, received 401.
{
  "message": "Invalid credentials"
}
```

The second message tells you exactly which API call failed and what the server responded with. This saves minutes of debugging.

**Why pass `operation` as a string?** Each API call in a test has a different context (e.g., "Setup: create task for GET" vs. "GET /tasks/42"). The operation string identifies which call failed when a test makes multiple API calls.

```typescript
export function expectHttpStatusOneOf(
  actual: number, allowed: readonly number[], operation: string, body?: unknown,
): void {
  expect(
    allowed.includes(actual),
    `${operation}: expected one of [${allowed.join(', ')}], received ${actual}.\n${formatBody(body)}`,
  ).toBeTruthy();
}
```

**Why allow multiple status codes?** Vikunja sometimes returns 200 for creation and sometimes 201. Rather than arguing about which is "correct", the assertion accepts both. This makes tests resilient to minor API behavior changes.

```typescript
export function expectDeletedResourceInaccessible(
  status: number, body: unknown, operation: string,
): void {
  expect(
    status === HttpStatus.NOT_FOUND || status === HttpStatus.FORBIDDEN,
    `${operation}: expected 404 or 403 after delete, received ${status}.\n${formatBody(body)}`,
  ).toBeTruthy();
}
```

**Why accept both 404 and 403?** After deleting a resource, some APIs return 404 ("not found") and others return 403 ("forbidden — you can't access this"). Vikunja's behavior may vary. Accepting both makes the test correct regardless.

---

## 4. Test Files

---

### `tests/auth/login.spec.ts`

**Structure:** Two `test.describe` blocks — "User Login — UI" and "User Login — API".

**UI Tests:**

**Happy path:**
```typescript
test('should login with valid credentials', { tag: ['@smoke', '@regression', '@ui'] }, async ({ loginPage }) => {
  const { testUser } = readState();
  await loginPage.goto();
  await loginPage.login(testUser.username, testUser.password);
  await loginPage.expectLoginSuccess();
});
```
Uses the seeded test user from global setup. Tagged `@smoke` because login is the most critical feature.

**Negative cases (data-driven):**
```typescript
const negativeUiCases = [
  {
    name: 'invalid password',
    build: (seed) => ({ username: seed.username, password: TestDataHelper.wrongPassword() }),
  },
  {
    name: 'non-existent user',
    build: () => ({ username: TestDataHelper.nonexistentUsername(), password: TestDataHelper.wrongPassword() }),
  },
];

for (const scenario of negativeUiCases) {
  test(`should show error — ${scenario.name}`, { tag: ['@regression', '@ui'] }, async ({ loginPage }) => {
    const creds = scenario.build(readState().testUser);
    await loginPage.goto();
    await loginPage.login(creds.username, creds.password);
    await loginPage.expectLoginError();
  });
}
```

**Why data-driven?** Both negative cases follow the same flow: go to login, enter credentials, verify error. The only difference is the credential data. A `for` loop eliminates code duplication while generating distinct test names in the report.

**Why not `test.each()`?** Playwright doesn't have `test.each()` like Jest. The `for...of` loop with template literal test names is the Playwright-idiomatic way to do data-driven tests.

**API Tests:**
```typescript
test('should return a token for valid credentials', async ({ authApi }) => {
  const { testUser } = readState();
  const response = await authApi.login({ username: testUser.username, password: testUser.password });
  expectLoginSuccessResponse(response.status, response.data, 'POST /login (seeded user)');
});
```
Tests the API directly without a browser. Verifies the response includes a non-empty token. This catches API-level regressions that the UI might mask (e.g., the UI could show "success" even if the token is empty).

---

### `tests/auth/registration.spec.ts`

**UI Tests:**
- **Successful registration:** Creates a completely new unique user via `TestDataHelper.uniqueUser()`. Verifies redirect away from `/register`.
- **Duplicate username:** Attempts to register with the seeded user's username but a different email. Verifies error message appears.
- **Empty form:** Verifies the submit button is disabled without filling any fields. This is a UI-only test — no API equivalent because the API would simply reject an empty payload.
- **Navigation link:** Verifies the "login" link is visible on the registration page.

**API Tests:**
- **Successful registration:** Same as UI but via API. Asserts `HttpStatus.OK`.
- **Duplicate username:** Via API. Asserts 4xx response via `expectClientError`.

**Why both UI and API tests for the same feature?** They test different things:
- UI tests verify the form renders correctly, buttons enable/disable properly, error messages display.
- API tests verify the server logic — correct status codes, proper validation.

A bug could exist in only one layer (e.g., the API correctly rejects duplicates but the UI doesn't show the error).

---

### `tests/tasks/tasks-crud.spec.ts`

**Setup:**
```typescript
test.beforeAll(async () => {
  const { testUser } = readState();
  apiClient = new ApiClient();
  const authApi = new AuthApi(apiClient);
  await authApi.login({ username: testUser.username, password: testUser.password });
  projectsApi = new ProjectsApi(apiClient);
  tasksApi = new TasksApi(apiClient);

  const project = await projectsApi.create({ title: TestDataHelper.uniqueProjectTitle('Tasks Test') });
  projectId = project.data.id;
});
```

**Why `beforeAll` instead of `beforeEach`?** Creating a project for every test would be wasteful — all CRUD tests can share one project. The project is uniquely named so multiple test runs don't collide.

**Why manual `ApiClient` creation instead of fixtures?** Fixtures are per-test (scoped to each `test()` function). The CRUD tests need a shared, authenticated client across all tests in the describe block. `beforeAll` runs once for the group, and the `apiClient` variable persists across tests.

**Data-driven creation test:**
```typescript
const createCases = [
  { name: 'title and description', build: () => ({ title: uniqueTaskTitle(), description: '...' }) },
  { name: 'title only', build: () => ({ title: uniqueTaskTitle() }) },
];

test('should create tasks (data-driven shapes)', async ({}, testInfo) => {
  for (const scenario of createCases) { ... }
});
```
Tests two different payload shapes in one test. This verifies that the API handles both required and optional fields correctly.

**Failure attachment pattern:**
```typescript
if (response.status !== HttpStatus.OK && response.status !== HttpStatus.CREATED) {
  await attachJson(testInfo, `task-create-${scenario.name}.json`, {
    status: response.status,
    body: response.data,
  });
}
```
On unexpected status codes, the response is attached to the HTML report **before** the assertion fails. This ensures the debugging data is captured even though the test will throw on the next line.

**Delete + verify pattern:**
```typescript
const deleteResponse = await tasksApi.delete(created.data.id);
expectHttpStatus(deleteResponse.status, HttpStatus.OK, 'DELETE /tasks/...');

const getResponse = await tasksApi.get(created.data.id);
expectDeletedResourceInaccessible(getResponse.status, getResponse.data, 'GET /tasks/... after delete');
```
Deletes a task and then attempts to fetch it. The second call should fail with 404 or 403. This verifies the delete actually removed the resource (not just returned 200 without doing anything).

---

## 5. Design Decisions & Alternatives

### Why Playwright instead of Cypress or Selenium?

| Factor | Playwright | Cypress | Selenium |
|--------|-----------|---------|----------|
| API testing built-in | Yes (`APIRequestContext`) | Limited (`cy.request`) | No (needs separate library) |
| Multi-browser support | Chromium, Firefox, WebKit | Chromium only (others experimental) | All browsers |
| TypeScript support | Native | Native | Via bindings |
| Auto-waiting | Built-in | Built-in | Manual |
| Parallel execution | Built-in | Via CI parallelization | Via Grid |
| Trace viewer | Built-in | Dashboard (paid) | No |

Playwright was chosen because the task requires **combined UI/API tests** — Playwright's `APIRequestContext` makes API calls first-class citizens alongside browser tests.

### Why Page Object Model instead of Screenplay Pattern?

POM is widely understood, requires no extra libraries, and maps directly to application pages. The Screenplay Pattern is more flexible but adds abstraction layers (Actors, Tasks, Questions, Abilities) that are overkill for a project with 3 pages.

### Why not use Playwright's `storageState` for authentication?

`storageState` saves browser cookies/localStorage and reuses them across tests. This works for UI tests but doesn't help API tests (which don't use a browser). Since our framework has both UI and API tests, file-based state sharing (`readState()`) works for both.

### Why sequential execution instead of parallel?

Vikunja has aggressive rate limiting. Parallel tests trigger 429 errors and cause false failures. Sequential execution with `workers: 1` ensures reliable results. If rate limiting were removed, switching to parallel would be a one-line config change (`workers: undefined`).

### Why `as const` on config objects?

`as const` narrows types to literal values. Without it, `HttpStatus.OK` has type `number`. With it, `HttpStatus.OK` has type `200`. This enables TypeScript to catch mistakes like `expectHttpStatus(response.status, HttpStatus.OK + 1, ...)` at compile time.

### Why not use a test database or Docker-based test isolation?

The application runs as a Docker container provided by the task. Resetting the database between tests would require Docker volume manipulation, which the task explicitly says is out of scope ("Do not modify the application or docker-compose configuration"). Instead, unique test data per test achieves isolation without touching the database.
