# Encryption key rotation

Back up PostgreSQL and the existing encryption keys before changing key configuration. A database backup without its historical keys cannot restore secrets.

1. Keep `MASTER_ENCRYPTION_KEY` unchanged: it decrypts all `legacy` rows.
2. Generate a new 32-byte key. Add it under a new ID in the `ENCRYPTION_KEYRING` JSON object on **every** API and worker instance. Keep `ENCRYPTION_KEY_ID=legacy` for this first rollout. Never reuse an ID for different key material.
3. After every instance can read the new key, set `ENCRYPTION_KEY_ID` to its new ID and deploy again. New writes now use the new key; legacy rows remain readable.
4. Run `pnpm -C apps/api secrets:rotate` in a trusted administrative environment with the same database and complete keyring. The tool locks each row, processes batches and skips rows already using the active key. It can be restarted after interruption. It never prints plaintext or key material.
5. Confirm `SELECT key_id, count(*) FROM automation_secrets GROUP BY key_id` shows the expected IDs. Test a demo-only secret through a worker and perform a restore drill before retiring keys. Retain old keys securely for the entire backup retention period.

Database migrations run at startup under an advisory lock by default. `AUTO_MIGRATE=false` opts out; in that case run `pnpm -C apps/api db:migrate` before deploying code requiring the new schema. Migration 0006 adds key IDs, durable admin action tokens and idempotency records without deleting existing data.

Create and template-clone requests accept an `Idempotency-Key` header (16–100 letters, digits, underscores or hyphens). Reuse the same key and input for retries of one logical action. Different input with the same key returns 409. Keys are scoped to the authenticated user and operation. They are retained for 30 days; clients must not retry older operations.
