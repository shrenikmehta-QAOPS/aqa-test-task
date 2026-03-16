# QA Automation Test Task

This repository is a test task for QA automation candidates. You will set up a **TypeScript + Playwright** test project and automate test cases for a to-do–style application (Vikunja) with extended functionality (lists, tasks, projects, teams). The more advanced your solution, the better; **combined UI/API** tests are valued. Estimated time: **2–4 hours**.

---

## Prerequisites

- **Docker** and **Docker Compose** installed
- **Node.js** (e.g. 18+) for the test project
- Ensure port **8080** is free on your machine

---

## Application Setup

The application is defined in **[application/docker-compose.yml](application/docker-compose.yml)**.

1. From the repository root, start the application:
   ```bash
   cd application && docker-compose up -d
   ```
2. Open **http://localhost:8080** in your browser.
3. On first visit, you can register an account (no pre-created users).

**Optional commands:**

- Verify services: `docker-compose ps`
- View logs: `docker-compose logs -f vikunja`
- Stop and remove: `docker-compose down` (add `-v` to remove volumes)

---

## About the Application

The application is [Vikunja](https://github.com/go-vikunja/vikunja): an open-source to-do and task management app with lists, tasks, projects, and teams. Use the [Vikunja GitHub repository](https://github.com/go-vikunja/vikunja) and documentation to explore features and API when designing your tests.

---

## Test Task

### Goal

Set up a **TypeScript + Playwright** project **inside the `qa/` folder** (sibling to `application/`) and automate test cases for the application above.

### Tech Stack

- **TypeScript**
- **Playwright** (current stable or minimum version — state the version in your `qa/` README)

### Expectations

- We evaluate the quality of your framework implementation (project layout, config, page/flow abstractions, fixtures, reporting, etc.), not only that tests pass.
- **The more advanced, the better** (e.g. clear structure, reusable page/flow abstractions, config such as base URL via environment variables, optional reporting or CI-friendly run commands).
- **Combined UI/API** test cases are a strong plus where they make sense.

### Task as a Challenge

We expect to receive:

1. **A checklist from you** — your test scope/plan (what you chose to cover and why).
2. **At least one CRUD** implemented for **one of the application’s functional directions**: **projects**, **tasks**, or **teams** (Create, Read, Update, Delete as applicable).

**Minimal coverage to aim for:**

- **User registration** and **user login**
- **CRUD** for at least one of: projects, tasks, or teams

---

## How to Submit Your Work

1. **Fork** this repository to your own account (e.g. GitHub or GitLab).
2. **Implement** the TypeScript + Playwright framework and test cases **inside the `qa/` folder**. Repo layout: `application/` = app, `qa/` = your test project.
3. **Contact HR with the link** to your forked repository for code review. Use the submission channel/link that HR provided you.
4. **Include** inside the `qa/` folder a **README** that describes the QA project structure and features (how to run tests, design choices, your checklist/scope).

**Important:** Do not open a pull request to the original repository. We review the code in your fork via the link you provide.

---

## Before You Submit

- [ ] The application runs at http://localhost:8080.
- [ ] Tests run successfully using the commands documented in your `qa/` README.
- [ ] The `qa/` README describes your project structure, features, and how to run the tests.

---

## Out of Scope

Do not modify the **application** or **docker-compose** configuration. Only add the test project under **qa/** and the documentation described above. Combined UI/API cases are valued.

---

## Troubleshooting

- **Port 8080 in use:** Ensure no other service is using port 8080.
- **Docker issues:** Check that Docker and Docker Compose are installed and up to date. See [Vikunja documentation](https://vikunja.io/docs/) or [Docker documentation](https://docs.docker.com/) if needed.
