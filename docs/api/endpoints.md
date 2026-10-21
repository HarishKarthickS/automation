# API endpoint reference

There are **50 explicitly registered method/path pairs** in `apps/api/src/routes/`,
plus Better Auth's `/api/v1/auth/*` passthrough. This includes health aliases and
admin operations; the earlier estimate of roughly 32 endpoints omitted routes.

Live public API base: `https://automiqs.vercel.app/api/v1` (frontend proxy).
For health and internal scheduler access, use the operator's configured Render
API origin. The proxy only forwards `/api/*`; it does not expose root health paths.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/v1/admin/overview` | Admin session |
| POST | `/api/v1/admin/actions/preflight` | Admin session |
| GET | `/api/v1/admin/users` | Admin session |
| PATCH | `/api/v1/admin/users/:id` | Admin session |
| DELETE | `/api/v1/admin/users/:id` | Admin session |
| GET | `/api/v1/admin/automations` | Admin session |
| PATCH | `/api/v1/admin/automations/:id` | Admin session |
| DELETE | `/api/v1/admin/automations/:id` | Admin session |
| GET | `/api/v1/admin/runs` | Admin session |
| DELETE | `/api/v1/admin/runs/:id` | Admin session |
| GET | `/api/v1/admin/templates` | Admin session |
| PATCH | `/api/v1/admin/templates/:id` | Admin session |
| DELETE | `/api/v1/admin/templates/:id` | Admin session |
| GET | `/api/v1/admin/onboarding` | Admin session |
| GET | `/api/v1/admin/events` | Admin session |
| DELETE | `/api/v1/admin/events/:id` | Admin session |
| GET | `/api/v1/admin/audit-logs` | Admin session |
| GET | `/api/v1/admin/settings` | Admin session |
| PATCH | `/api/v1/admin/settings` | Admin session |
| GET | `/api/v1/csrf-token` | Public |
| GET | `/api/v1/session` | Public |
| POST | `/api/v1/automations` | Session |
| GET | `/api/v1/automations` | Session |
| GET | `/api/v1/automations/:id` | Session |
| PUT | `/api/v1/automations/:id` | Session |
| DELETE | `/api/v1/automations/:id` | Session |
| POST | `/api/v1/automations/:id/publish` | Session |
| POST | `/api/v1/automations/:id/unpublish` | Session |
| POST | `/api/v1/automations/:id/trigger` | Session |
| GET | `/` | Public |
| GET | `/health` | Public |
| GET | `/heath` | Public |
| GET | `/ready` | Public |
| POST | `/api/v1/internal/run-due-automations` | Internal bearer token |
| GET | `/api/v1/internal/observability/metrics` | Internal bearer token |
| GET | `/api/v1/internal/observability/alerts` | Internal bearer token |
| GET | `/api/v1/metrics/summary` | Session |
| GET | `/api/v1/dashboard/overview` | Session |
| GET | `/api/v1/onboarding/status` | Session |
| POST | `/api/v1/onboarding/step` | Session |
| GET | `/api/v1/automations/:id/runs` | Session |
| GET | `/api/v1/runs/:id` | Session |
| GET | `/api/v1/reliability/summary` | Session |
| GET | `/api/v1/runtimes` | Session |
| POST | `/api/v1/automations/:id/secrets` | Session |
| GET | `/api/v1/automations/:id/secrets` | Session |
| DELETE | `/api/v1/automations/:id/secrets/:key` | Session |
| GET | `/api/v1/templates` | Public |
| GET | `/api/v1/templates/:id` | Public |
| POST | `/api/v1/templates/:id/clone` | Session |

## Authentication and requests

- Better Auth passthrough includes `POST /api/v1/auth/sign-up/email`,
  `POST /api/v1/auth/sign-in/email`, `POST /api/v1/auth/sign-out`, and
  `GET /api/v1/auth/get-session`. These are provider routes, outside the count above.
- Session routes require the Better Auth session cookie; suspended users are blocked.
- Admin routes additionally require an admin role or configured admin email.
- For non-auth, non-internal mutations, first GET `/api/v1/csrf-token` with
  credentials included, then send its `csrfToken` as `x-csrf-token` alongside the cookie.
- Internal routes require `Authorization: Bearer <INTERNAL_CRON_TOKEN>` and do not
  use browser CSRF. The scheduler responds `202` after enqueue/fallback initiation.
- Admin destructive actions require `x-admin-action-token` from
  `POST /api/v1/admin/actions/preflight`; see the admin routes for operation details.
- Secret routes return metadata only, never plaintext or encryption material.
- Validation errors return `400`, missing sessions `401`, rejected CSRF/admin access
  `403`, and unavailable/not-owned resources typically `404`.

Request/response types and validation live in `packages/shared/src/api-types.ts`
and `packages/shared/src/schemas.ts`. Route handlers are the source of truth.
