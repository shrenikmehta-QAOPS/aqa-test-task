# Vikunja QA Automation Tests

TypeScript + Playwright test framework for the Vikunja to-do application.

## Tech Stack

| Technology   | Version      |
|-------------|-------------|
| TypeScript  | ^5.7.0      |
| Playwright  | ^1.49.0     |
| Node.js     | 18+ (tested with 24.x) |
| dotenv      | ^16.4.0     |

## Project Structure

```
qa/
├── playwright.config.ts          # Playwright configuration (uses appConfig)
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies and scripts
├── .env                          # Environment variables (BASE_URL, API_URL, timeouts)
├── .env.example                  # Documented env vars with defaults
├── src/
│   ├── config/
│   │   └── app.config.ts         # Centralized config (URLs, timeouts, test defaults, reporting)
│   ├── constants/
│   │   └── http.ts               # Named HTTP status codes (OK, CREATED, NOT_FOUND, etc.)
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces (Login, Register, Project, Task)
│   ├── api/
│   │   ├── api-client.ts         # Generic API client with JWT management and 429 retry
│   │   ├── auth.api.ts           # Auth API helper (register, login)
│   │   ├── projects.api.ts       # Projects API helper (used as task container)
│   │   └── tasks.api.ts          # Tasks CRUD API helper
│   ├── pages/
│   │   ├── base.page.ts          # Base page object with shared utilities
│   │   ├── login.page.ts         # Login page object
│   │   └── register.page.ts      # Registration page object
│   ├── fixtures/
│   │   └── test.fixture.ts       # Custom Playwright fixtures (API client, page objects)
│   └── helpers/
│       ├── test-data.helper.ts   # Test data generation (unique names, emails, passwords)
│       ├── api-assertions.ts     # Reusable API assertion helpers with descriptive messages
│       ├── redact.ts             # Sensitive data redaction for logs/reports
│       └── test-context.ts       # Playwright report attachment helper (redacted JSON)
└── tests/
    ├── auth/
    │   ├── registration.spec.ts  # User registration tests (UI + API)
    │   └── login.spec.ts         # User login tests (UI + API)
    └── tasks/
        └── tasks-crud.spec.ts    # Tasks CRUD tests (API, data-driven)
```

## Design Choices

### Centralized Configuration

All URLs, timeouts, test-data defaults, and reporting paths are managed in a single `src/config/app.config.ts`. Every value is overridable via environment variables (documented in `.env.example`). No hardcoded values exist in test files or page objects.

### Page Object Model (POM)

UI interactions for auth flows are encapsulated in page objects (`LoginPage`, `RegisterPage`) under `src/pages/`, each extending `BasePage`. All timeouts inside page objects reference `appConfig`.

### API Client Layer

A reusable `ApiClient` class wraps Playwright's `APIRequestContext` with JWT token management and automatic 429 rate-limit retry. Domain-specific helpers (`AuthApi`, `ProjectsApi`, `TasksApi`) provide typed methods per endpoint.

### Custom Fixtures

Playwright fixtures in `src/fixtures/test.fixture.ts` provide:
- `apiClient` — API client with automatic cleanup
- `authApi` — auth helper tied to the API client
- `loginPage` — login page object
- `registerPage` — register page object

### Dynamic Test Data

`TestDataHelper` generates unique, random data using `crypto.randomBytes` — usernames, emails, passwords, project titles, and task titles. No hardcoded credentials exist anywhere in the codebase.

### Sensitive Data Handling

`src/helpers/redact.ts` deep-clones objects and replaces sensitive keys (`password`, `token`, `authorization`, etc.) with `[REDACTED]` before attaching data to reports. The `attachJson()` helper applies this automatically.

### Reusable API Assertions

`src/helpers/api-assertions.ts` provides assertion helpers with descriptive failure messages that include the operation name and response body:
- `expectHttpStatus()` — exact status match
- `expectHttpStatusOneOf()` — flexible for 200/201 create endpoints
- `expectLoginSuccessResponse()` — validates status + token
- `expectAuthFailureStatus()` — validates 4xx for bad credentials
- `expectClientError()` — validates 4xx for validation errors
- `expectDeletedResourceInaccessible()` — validates 404 or 403 after delete

### Test Tagging

Every test is tagged for selective execution:
- `@smoke` — critical happy-path tests
- `@regression` — full regression suite
- `@ui` — browser-based tests
- `@api` — API-level tests

### Data-Driven Testing

Where applicable, tests use array-driven iteration to cover multiple scenarios from a single test definition:
- `login.spec.ts` — negative UI cases (invalid password, non-existent user)
- `tasks-crud.spec.ts` — task creation shapes (title only, title + description)

### Single Shared Test User

A single user (`testUser`) is registered **once** during global setup (before any tests run). Its credentials are saved to `.test-state.json` and read by all tests via `readState()`.

### Global Setup

`src/global-setup.ts` runs once before the entire test suite:
1. Registers a single `testUser` with a random unique username/email
2. Writes the credentials to `.test-state.json`
3. All tests read from this file via `readState()` — no further registrations occur

### Reporting

Multiple reporters are configured:
- **list** — console output during test runs
- **html** — visual HTML report with attachments, traces, screenshots
- **json** — machine-readable results (`test-results/results.json`)
- **junit** — CI dashboard integration (enabled when `CI=true`)

On failure, tests automatically capture:
- Playwright traces (on first retry)
- Screenshots
- Videos
- Structured JSON attachments (redacted) for failed API calls

## Prerequisites

1. **Docker**: The Vikunja application must be running on `http://localhost:8080`
   ```bash
   cd application && docker compose up -d
   ```

2. **Node.js 18+**: Required for the test project

## Setup

```bash
cd qa
npm install
npx playwright install --with-deps chromium
```

## Running Tests

```bash
# Run all tests
npm test

# Run smoke tests only
npm run test:smoke

# Run full regression suite
npm run test:regression

# Run only UI tests
npm run test:ui

# Run only API tests
npm run test:api

# Run authentication tests
npm run test:auth

# Run task CRUD tests
npm run test:tasks

# Run tests in headed mode (visible browser)
npm run test:headed

# Run tests in debug mode
npm run test:debug

# View HTML report after test run
npm run report

# TypeScript type checking
npm run lint
```

### Custom Base URL

```bash
BASE_URL=http://custom-host:9090 API_URL=http://custom-host:9090/api/v1 npm test
```

### Environment Variables

All configurable values are documented in `.env.example`:

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:8080` | Application base URL |
| `API_URL` | `http://localhost:8080/api/v1` | API base URL |
| `PW_TEST_TIMEOUT_MS` | `60000` | Per-test timeout |
| `PW_EXPECT_TIMEOUT_MS` | `10000` | Default expect timeout |
| `PW_ACTION_TIMEOUT_MS` | `15000` | UI action timeout (click, fill) |
| `PW_NAVIGATION_TIMEOUT_MS` | `30000` | Page navigation timeout |
| `PW_POST_AUTH_REDIRECT_MS` | `15000` | Post-login/register redirect wait |
| `PW_ERROR_BANNER_MS` | `5000` | Error message visibility timeout |
| `TEST_EMAIL_DOMAIN` | `test.local` | Domain for generated test emails |
| `TEST_USERNAME_PREFIX` | `test` | Prefix for generated usernames |
| `CI` | — | Enables CI mode (retries, JUnit, forbidOnly) |

## Test Scope / Checklist

### What is covered and why

#### User Registration (UI + API)
- [x] Successful registration with valid credentials
- [x] Error shown for duplicate username
- [x] Submit button disabled when fields are empty
- [x] Link to login page is present
- [x] API: register a new user (status 200)
- [x] API: reject duplicate username (4xx)

**Why:** Registration is the entry point to the application. Every user journey starts here.

#### User Login (UI + API)
- [x] Successful login with valid credentials
- [x] Error shown for wrong password
- [x] Error shown for non-existent user
- [x] Link to register page is present
- [x] Navigation to register page works
- [x] API: return a token for valid credentials
- [x] API: reject login with wrong password (4xx)

**Why:** Login is the gatekeeper to all other functionality. Verifying both the UI flow and raw API response ensures end-to-end correctness.

#### Tasks CRUD (API)
- [x] Create a task with title and description (data-driven)
- [x] Create a task with title only (data-driven)
- [x] Read a task by ID
- [x] List tasks in a project
- [x] Update a task title
- [x] Delete a task and confirm it is inaccessible

**Why:** Tasks are the primary unit of work in a to-do application. Full CRUD coverage verifies the core feature end-to-end. The API layer is used for speed and reliability; tasks require a project container which is created in `beforeAll`.

### Out of Scope (potential future coverage)
- [ ] Projects CRUD (UI + API)
- [ ] Teams CRUD (UI + API)
- [ ] Task labels, priorities, due dates
- [ ] Task comments and attachments
- [ ] User profile and settings
- [ ] Sharing projects with teams/users
- [ ] Accessibility testing
- [ ] Performance/load testing

## CI Integration

The framework is CI-ready:
- `forbidOnly` is enabled when `CI=true`
- Retries are set to 2 in CI mode
- HTML reports, traces, screenshots, and videos are generated on failure
- JSON and JUnit reports are produced for CI dashboards

Example CI command:
```bash
CI=true npx playwright test
```
