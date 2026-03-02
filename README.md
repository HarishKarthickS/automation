# Automiq

Production-grade Cron-as-a-Service + Node code runner SaaS.

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
- Safe subprocess execution with timeout + output limits + cleanup
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

- Auth passthrough: Better Auth mounted at `/api/v1/auth/*`
- Session helper: `GET /api/v1/session`
- CSRF token: `GET /api/v1/csrf-token`
- Automations:
  - `POST /api/v1/automations`
  - `GET /api/v1/automations`
  - `GET /api/v1/automations/:id`
  - `PUT /api/v1/automations/:id`
  - `DELETE /api/v1/automations/:id`
  - `POST /api/v1/automations/:id/trigger`
  - `POST /api/v1/automations/:id/publish`
  - `POST /api/v1/automations/:id/unpublish`
- Secrets:
  - `POST /api/v1/automations/:id/secrets`
  - `GET /api/v1/automations/:id/secrets`
  - `DELETE /api/v1/automations/:id/secrets/:key`
- Runs:
  - `GET /api/v1/automations/:id/runs`
  - `GET /api/v1/runs/:id`
- Templates:
  - `GET /api/v1/templates`
  - `GET /api/v1/templates/:id`
  - `POST /api/v1/templates/:id/clone`
- Scheduler (internal):
  - `POST /api/v1/internal/run-due-automations`

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
    code: "console.log('alive')",
    runtime: "nodejs20",
    cronExpr: "*/5 * * * *",
    timezone: "UTC",
    timeoutSeconds: 30,
    enabled: true,
    tags: ["monitoring"]
  })
}).then((r) => r.json());
```

## Security Notes

- Session cookies are `httpOnly`, secure in production, and cross-site compatible.
- CSRF protection uses double-submit token for non-auth mutating routes.
- Secrets are encrypted server-side with AES-256-GCM and never returned in plaintext.
- Executor isolates runs in temporary directories, limits output bytes, enforces timeout, and cleans up files.
- Internal scheduler endpoint requires bearer token.

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
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `FRONTEND_ORIGIN`
- `CORS_ORIGINS`
- `MASTER_ENCRYPTION_KEY`
- `INTERNAL_CRON_TOKEN`
- `MAX_CODE_SIZE_BYTES`
- `MAX_OUTPUT_BYTES`
- `DEFAULT_TIMEOUT_SECONDS`
- `MAX_TIMEOUT_SECONDS`
- `EXECUTION_CONCURRENCY`
- `PER_USER_CONCURRENT_RUNS`
- `PER_USER_DAILY_RUN_LIMIT`
- `RUN_RETENTION_DAYS`

### Web

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_APP_URL`

## Testing

Run API tests:

- `pnpm -C apps/api test`

Run full workspace tests:

- `pnpm test`

