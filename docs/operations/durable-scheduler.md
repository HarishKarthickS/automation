# Durable scheduling and recovery

PostgreSQL is the source of truth for queued runs, snapshots, retry deadlines, admissions and leases. Redis is a best-effort notification/cache service; losing a Redis message does not lose a run. Workers poll PostgreSQL every second. The internal cron endpoint remains useful for an external wake-up and monitoring, but is no longer the only source of progress.

The schedule claim transaction locks due automation rows, inserts queued runs with code/runtime snapshots, and advances schedules atomically. Manual triggers only insert queued records. All paths use the same worker admission routine. A PostgreSQL advisory transaction lock serializes global and per-user capacity reservations across processes. Daily quota counts admissions in the current UTC day, including execution attempts, rather than queued or capacity-rejected rows.

Workers renew a 30-second lease every five seconds. A lease records a unique ownership token; a stale worker cannot finalize a reclaimed run. Permission checks occur at claim, admission, execution and heartbeat. Suspending or revoking approval cancels queued work and active work at the next heartbeat. Pausing prevents scheduled/retry work from starting; explicit manual runs may execute paused automations.

After a worker crash, the next worker marks the expired attempt failed with `worker_lost` and schedules at most one delayed retry, subject to the maximum attempt count and current permissions. Retries use stored `available_at` deadlines and immutable source snapshots. Unexpected preparation failures also reach a terminal state. Shutdown aborts active containers before closing database connections.

Delivery is **at least once**, not exactly once. A crash after an external effect but before recording success can repeat that effect. Use `AUTOMIQ_RUN_ID` as a logical-run idempotency key in downstream systems; `AUTOMIQ_ATTEMPT_ID` identifies each attempt. A database lease alone cannot make arbitrary external effects transactional. A worker outage skips missed schedule occurrences according to the existing next-occurrence policy; it does not replay every historical minute.

Retention: completed runs follow `RUN_RETENTION_DAYS`; pending/running runs are preserved. Product events retain 90 days, request idempotency records 30 days, and admin audit logs 365 days. Expired admin confirmation tokens are pruned. Cleanup runs at most hourly per process. Retain encrypted backups under an explicit operations policy independent of these live-table limits.
