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
├── playwright.config.ts          # Playwright configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies and scripts
├── .env                          # Environment variables (BASE_URL, API_URL)
├── .env.example                  # Example env file
├── src/
│   ├── config/
│   │   └── env.config.ts         # Centralized env config
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces (Login, Register, Project, Task)
│   ├── api/
│   │   ├── api-client.ts         # Generic API client wrapper (GET/POST/PUT/DELETE)
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
│       └── test-data.helper.ts   # Test data generation (unique names, emails, etc.)
└── tests/
    ├── auth/
    │   ├── registration.spec.ts  # User registration tests (UI + API)
    │   └── login.spec.ts         # User login tests (UI + API)
    └── tasks/
        └── tasks-crud.spec.ts    # Tasks CRUD tests (API)
```

## Design Choices

### Page Object Model (POM)
UI interactions for auth flows are encapsulated in page objects (`LoginPage`, `RegisterPage`) under `src/pages/`, each extending `BasePage`.

### API Client Layer
A reusable `ApiClient` class wraps Playwright's `APIRequestContext` with JWT token management. Domain-specific helpers (`AuthApi`, `ProjectsApi`, `TasksApi`) provide typed methods per endpoint.

### Custom Fixtures
Playwright fixtures in `src/fixtures/test.fixture.ts` provide:
- `apiClient` — unauthenticated API client
- `authApi` — auth helper tied to the API client
- `loginPage` — login page object
- `registerPage` — register page object

### Single Shared Test User
A single user (`testUser`) is registered **once** during global setup (before any tests run). Its credentials are saved to `.test-state.json` and read by all tests via `readState()`. No additional registrations happen during the test run.

### Global Setup
`src/global-setup.ts` runs once before the entire test suite:
1. Registers a single `testUser` with a random unique username/email
2. Writes the credentials to `.test-state.json`
3. All tests read from this file via `readState()` — no further registrations occur

### Test Data Isolation
`TestDataHelper` generates unique, random data (task titles, project names, emails) per test to prevent collisions. All tests share the same user account but operate on their own uniquely-named resources.

### Configuration
- Base URL and API URL are configurable via `.env` or environment variables
- Playwright config supports CI mode (retries, forbidOnly)
- HTML reporter generates reports automatically

## Prerequisites

1. **Docker**: The Vikunja application must be running on `http://localhost:8080`
   ```bash
   cd application && docker compose up -d
   ```

2. **Node.js 18+**: Required for the test project

## Setup

```bash
# Navigate to the qa directory
cd qa

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps chromium
```

## Running Tests

```bash
# Run all tests
npm test

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
```

### Custom Base URL

```bash
BASE_URL=http://custom-host:9090 API_URL=http://custom-host:9090/api/v1 npm test
```

## Test Scope / Checklist

### What is covered and why

#### User Registration (UI + API)
- [x] Successful registration with valid credentials
- [x] Error shown for duplicate username
- [x] Submit button disabled when fields are empty
- [x] Link to login page is present

**Why:** Registration is the entry point to the application. Every user journey starts here.

#### User Login (UI + API)
- [x] Successful login with valid credentials and token returned
- [x] Error shown for wrong password
- [x] Error shown for non-existent user
- [x] Link to register page is present
- [x] Navigation to register page works

**Why:** Login is the gate-keeper to all other functionality. Verifying both the UI flow and raw API response ensures end-to-end correctness.

#### Tasks CRUD (API)
- [x] Create a task in a project
- [x] Read a task by ID
- [x] List tasks in a project
- [x] Update a task title
- [x] Delete a task and confirm it is gone

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
- HTML reports and traces are generated on failure
- Screenshots and videos are captured on failure

Example CI command:
```bash
CI=true npx playwright test
```
