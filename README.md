# Automiq

Personal automation workspace: cron-style jobs plus a multi-runtime code runner. Not a production SaaS product.

## Demo

- [Live frontend](https://automiqs.vercel.app/) (the older repository homepage redirects here).
- [Live API base via the frontend proxy](https://automiqs.vercel.app/api/v1).
- [API session check](https://automiqs.vercel.app/api/v1/session).
- Login: the deployed sign-in page does not publish shared demo credentials. Use
  [Create account](https://automiqs.vercel.app/signup) with a separate demo-only account,
  or run locally and sign up with your own test credentials. No shared login is provisioned by this repo.
- The Render API may sleep when idle. The first request can be slow while it wakes;
  wait about a minute and retry if the initial sign-in or data request times out.
- Suggested walkthrough: create an automation, select a runtime, set a cron schedule,
  trigger a manual run, and inspect the output in run history. Run only trusted code.

Screenshots below show the redesigned local production build. The dashboard uses
synthetic preview data from a temporary local API fixture, not a production account.
The fixture server is not part of the app. Deployment updates after merge.

| Landing page | Sign in | Workspace (preview data) |
| --- | --- | --- |
| ![Automation landing page](docs/images/landing.png) | ![Sign-in form](docs/images/login.png) | ![Workspace with preview data](docs/images/workspace-preview.png) |

## Stack

- Frontend: Next.js App Router + TypeScript + Tailwind (`apps/web`)
- Backend: Fastify + Better Auth + Drizzle (`apps/api`)
- Database: PostgreSQL (Railway)
- Scheduler: Render Cron hitting protected internal endpoint

## Monorepo Layout

- `apps/api` Fastify API, auth, scheduler, executor, DB
- `apps/web` Next.js dashboard and template marketplace
- `packages/shared` Shared Zod schemas and API types

## Core Capabilities

- Email/password signup and login via Better Auth sessions
- Automation CRUD with cron schedule and timezone
- Encrypted per-automation secrets (AES-256-GCM)
- Subprocess execution with env allowlist, timeouts and output limits + cleanup
- Multi-runtime execution support for Node.js, C++, Java, Python, Go, and Rust
- Run history/logs and manual trigger
- Internal scheduler endpoint (`/api/v1/internal/run-due-automations`)
- Public template publishing and clone workflow

## Local Development

1. Install pnpm
   - `corepack enable`
   - `corepack prepare pnpm@10.6.5 --activate`
2. Install dependencies
   - `pnpm install`
3. Configure env files
   - `apps/api/.env` from `apps/api/.env.example`
   - `apps/web/.env.local` from `apps/web/.env.example`
   - Generate `MASTER_ENCRYPTION_KEY` with:
     - `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
4. Run migrations
   - `pnpm -C apps/api db:generate`
   - `pnpm -C apps/api db:migrate`
   - In development, migrations auto-run at startup by default.
   - In production, set `AUTO_MIGRATE=true` only if you want startup migration behavior.
5. Start apps
   - API: `pnpm -C apps/api dev`
   - Web: `pnpm -C apps/web dev`

## API Overview

See the [complete endpoint reference](docs/api/endpoints.md), including public,
session, admin and internal-token routes, plus the Better Auth passthrough.
The browser uses the same-origin `/api/v1` proxy so session and CSRF cookies stay
on the frontend origin. Internal scheduler/health endpoints must use the API host directly.

## API Integration Examples

```ts
// browser-side authenticated call
const csrf = await fetch(`${API_BASE}/api/v1/csrf-token`, { credentials: "include" }).then((r) => r.json());

const automation = await fetch(`${API_BASE}/api/v1/automations`, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "x-csrf-token": csrf.csrfToken
  },
  body: JSON.stringify({
    name: "heartbeat",
    code: "print('alive')",
    runtime: "python312",
    cronExpr: "*/5 * * * *",
    timezone: "UTC",
    timeoutSeconds: 30,
    enabled: true,
    tags: ["monitoring"]
  })
}).then((r) => r.json());
```

## Security model

- Session cookies are `httpOnly`, secure in production, and cross-site compatible.
- CSRF protection uses double-submit token for non-auth mutating routes.
- Secrets are encrypted server-side with AES-256-GCM and never returned in plaintext.
- Jobs use **subprocess execution with env allowlist, timeouts and output limits**.
  Each run gets a temporary working directory with cleanup; this is not a security sandbox.
- Jobs run with the API host user's filesystem permissions and outbound network access.
  There are no per-job CPU, memory, disk or network quotas, containers or namespaces.
  Timeout/output termination targets the direct child; descendant processes may survive.
- The env allowlist prevents automatic inheritance of server credentials. It does not
  prevent host file access. Jobs can read, print or transmit their injected secrets;
  retained run output has no automatic secret redaction.
- Run only code and dependencies you trust. This personal workspace is not designed
  to isolate hostile tenants. See the [execution model](docs/security/sandbox.md).
- Internal scheduler endpoint requires bearer token.
- Due scheduler triggers are enqueued into Redis list queue (`REDIS_DUE_QUEUE`, default `queue:run_due_automations`).
- If enqueue fails, API falls back to in-process async execution. This fallback is
  not durable across process restarts; Redis list consumption is not an exactly-once queue.

## Common Startup Error

- Error: `relation "user" does not exist`
  - Cause: database schema not migrated.
  - Fix: run `corepack pnpm --filter @automation/api db:migrate` (or set `AUTO_MIGRATE=true`).

## Deployment

### Railway PostgreSQL

1. Provision PostgreSQL service.
2. Copy connection URL to API `DATABASE_URL`.
3. If Railway URL uses `sslmode=require`, keep/add `uselibpqcompat=true`:
   - Example: `...?sslmode=require&uselibpqcompat=true`

### Render API

1. Create Web Service from repo root.
2. Root dir: `.`
3. Build command: `pnpm install --frozen-lockfile && pnpm --filter @automation/api build`
4. Start command: `pnpm --filter @automation/api start`
5. Health check path: `/health`
6. Set environment variables from `apps/api/.env.example`.
7. Create Render Cron Job:
   - URL: `https://<api-domain>/api/v1/internal/run-due-automations`
   - Method: `POST`
   - Header: `Authorization: Bearer <INTERNAL_CRON_TOKEN>`
   - Frequency: every minute

### Vercel Web

1. Create project from repo.
2. Root dir: `apps/web`
3. Build command: `pnpm build`
4. Output: default Next.js
5. Set `NEXT_PUBLIC_API_BASE_URL` to Render API domain.

## Required Environment Variables

### API

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `ADMIN_EMAILS` (optional bootstrap admins, comma-separated)
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `FRONTEND_ORIGIN`
- `CORS_ORIGINS`
- `MASTER_ENCRYPTION_KEY`
- `INTERNAL_CRON_TOKEN`
- `REDIS_DUE_QUEUE` (optional, default `queue:run_due_automations`)
- `MAX_CODE_SIZE_BYTES`
- `MAX_OUTPUT_BYTES`
- `DEFAULT_TIMEOUT_SECONDS`
- `MAX_TIMEOUT_SECONDS`
- `EXECUTION_CONCURRENCY`
- `PER_USER_CONCURRENT_RUNS`
- `PER_USER_DAILY_RUN_LIMIT`
- `MAX_RUN_ATTEMPTS`
- `DUE_AUTOMATIONS_BATCH_SIZE`
- `RUN_RETENTION_DAYS`
- `OBS_ALERT_MIN_SUCCESS_RATE_24H`
- `OBS_ALERT_MAX_EXHAUSTED_RETRIES_24H`
- `OBS_ALERT_MAX_QUEUE_DEPTH`
- `OBS_ALERT_MAX_SCHEDULER_LAG_MINUTES`
- `ENABLED_RUNTIMES` (comma-separated runtime ids)
- `DEPENDENCY_ALLOWLIST_MODE` (`strict` or `relaxed`)
- `DEPENDENCY_MAX_COUNT`
- `DEPENDENCY_MAX_TOTAL_CHARS`
- `DEPENDENCY_INSTALL_TIMEOUT_SECONDS`
- `PYTHON_ALLOWED_PACKAGES` (comma-separated, used in strict mode)
- `GO_ALLOWED_MODULES` (comma-separated, used in strict mode)
- `RUST_ALLOWED_CRATES` (comma-separated, used in strict mode)

### Web

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_APP_URL`

## Testing

Run API tests:

- `pnpm -C apps/api test`

The [Tests workflow](.github/workflows/test.yml) runs API tests and API typechecking
on pull requests and pushes to main. Tests cover session/CSRF guards, secret-route
ownership and metadata responses, Redis enqueue/fallback behavior, encryption,
cron parsing, and real subprocess execution controls. Route suites mock the auth
provider, persistence and Redis rate limiter; they do not verify live signup/login,
PostgreSQL queries or Redis server behavior.

Run full workspace tests:

- `pnpm test`

## Runtime Docs (MkDocs)

Runtime and execution-control documentation is provided via MkDocs in `docs/` with config at `mkdocs.yml`.

## Reviewable development

New work is split into focused PRs for auth, scheduler, executor, secrets/CI and
product/demo documentation. See [the review order and change history](docs/development.md).
Existing commits are preserved; the original uploads have not been rewritten.
