# Deployment and restore verification

The default `render.yaml` provisions the API with execution disabled, required secrets supplied through the dashboard, additive migrations enabled and `/ready` as the readiness probe. Do not replace existing encryption keys when importing the Blueprint. `render-cron.yaml` is an optional separate Blueprint containing a supported `type: cron` service, not a root-level `cronJobs` block. Its wake-up is optional because the durable PostgreSQL worker polls schedules itself. Provisioning a new cron service is a separate hosting decision.

After deploying a release:

1. Compare `/api/v1/version` with the merged Git SHA. Render supplies `RENDER_GIT_COMMIT`; other hosts must set `BUILD_SHA`. A successful frontend deployment does not establish the backend version.
2. Check `/health` for liveness and `/api/v1/ready` for database schema, optional Redis status, worker heartbeat and actual runtime probes. Redis failure is reported as degraded; per-process rate limiting remains active. Global execution quotas remain in PostgreSQL. Install an edge rate limit when running multiple API instances; per-process HTTP limits are not a distributed request quota.
3. Repeat a nonempty template-list request across its cache lifetime. Check anonymous access to private routes is denied. Use a separate approved demo account for an authenticated create → secret → run → history check only after isolated execution readiness is true.
4. Verify a suspended/revoked account cannot start or retry jobs. Simulate worker interruption in staging and confirm its lease is recovered with the documented at-least-once semantics.
5. Keep `EXECUTION_MODE=disabled` if no Docker host has been configured. `/ready` explicitly distinguishes an API that can serve drafts from execution readiness. Configure the execution host using [Isolated execution](isolated-execution.md).

`TRUST_PROXY_HOPS` limits trusted proxy hops (default one); configure it for the actual reverse-proxy chain. Never trust arbitrary forwarded client addresses. Restrict direct backend ingress where supported by the hosting provider.

## Backup and restore drill

Keep encrypted PostgreSQL backups, encryption key versions, deployment configuration and a restore manifest in separate access-controlled storage. Choose a recovery point objective, recovery time objective and retention period before relying on unattended workloads. Those service-level targets depend on the operator's hosting plan; the repo cannot establish them by itself.

Run `pg_dump --format=custom` using a backup role and TLS connection. Restore into a **new isolated database**, not over the live database. Apply the matching application release and complete historical keyring, then check record counts, foreign-key consistency, automation schedules and decryption of a dedicated demo-only secret. Keep execution disabled during restore validation so restored schedules cannot run twice. Record the backup timestamp, release, schema revision and elapsed restore time; remove the disposable restore database only after verification.

The API CI job performs a real PostgreSQL dump/restore into a new disposable database and verifies a synthetic automation and its encrypted secret. This validates the repository's restore compatibility, not the existence or retention of production backups. A production backup schedule must be configured with the database provider.

## Tests

`pnpm -C apps/api test` runs local unit and route regressions. `RUN_DB_TESTS=true` with a disposable PostgreSQL database enables migration, transaction and scheduler integration tests. CI supplies that database. `RUN_SANDBOX_TESTS=true EXECUTION_MODE=docker` runs the Docker integration file; CI verifies all six runtime images.

`pnpm -C apps/web build` then `pnpm -C apps/web exec playwright test` runs browser regressions against local production Next.js with synthetic API fixtures. CI installs Chromium. Tests cover explicit timezone selection, available Node.js selection, pagination and same-client account switching. The CSRF client tests exercise real Fastify cookie/token middleware with a simulated multi-tab cookie jar.
