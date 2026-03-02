CREATE TYPE run_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'timed_out', 'killed');
CREATE TYPE run_triggered_by AS ENUM ('schedule', 'manual', 'retry');
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean NOT NULL DEFAULT false,
  "image" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY,
  "expires_at" timestamptz NOT NULL,
  "token" text NOT NULL UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamptz,
  "refresh_token_expires_at" timestamptz,
  "scope" text,
  "password" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_provider_account_idx UNIQUE ("provider_id", "account_id")
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "automations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "code" text NOT NULL,
  "runtime" text NOT NULL DEFAULT 'nodejs20',
  "cron_expr" text NOT NULL,
  "timezone" text NOT NULL,
  "next_run_at" timestamptz NOT NULL,
  "last_run_at" timestamptz,
  "timeout_seconds" integer NOT NULL DEFAULT 30,
  "enabled" boolean NOT NULL DEFAULT true,
  "is_template_published" boolean NOT NULL DEFAULT false,
  "published_at" timestamptz,
  "tags" text[] NOT NULL DEFAULT '{}',
  "clone_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "automation_secrets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "automation_id" uuid NOT NULL REFERENCES "automations"("id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "ciphertext" text NOT NULL,
  "iv" text NOT NULL,
  "auth_tag" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_secrets_unique_key UNIQUE ("automation_id", "key")
);

CREATE TABLE IF NOT EXISTS "runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "automation_id" uuid NOT NULL REFERENCES "automations"("id") ON DELETE CASCADE,
  "status" run_status NOT NULL DEFAULT 'queued',
  "attempt" integer NOT NULL DEFAULT 1,
  "started_at" timestamptz NOT NULL DEFAULT now(),
  "finished_at" timestamptz,
  "duration_ms" integer,
  "output" text NOT NULL DEFAULT '',
  "error" text,
  "exit_code" integer,
  "triggered_by" run_triggered_by NOT NULL DEFAULT 'schedule'
);

CREATE TABLE IF NOT EXISTS "templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "automation_id" uuid NOT NULL REFERENCES "automations"("id") ON DELETE CASCADE,
  "owner_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "code_snapshot" text NOT NULL,
  "runtime" text NOT NULL,
  "cron_expr" text NOT NULL,
  "timezone" text NOT NULL,
  "timeout_seconds" integer NOT NULL,
  "tags" text[] NOT NULL DEFAULT '{}',
  "is_published" boolean NOT NULL DEFAULT true,
  "clone_count" integer NOT NULL DEFAULT 0,
  "published_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT templates_automation_unique_idx UNIQUE ("automation_id")
);

CREATE INDEX IF NOT EXISTS session_user_id_idx ON "session"("user_id");
CREATE INDEX IF NOT EXISTS account_user_id_idx ON "account"("user_id");
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification"("identifier");
CREATE INDEX IF NOT EXISTS automations_due_idx ON "automations"("enabled", "next_run_at");
CREATE INDEX IF NOT EXISTS automations_user_updated_idx ON "automations"("user_id", "updated_at");
CREATE INDEX IF NOT EXISTS automations_published_idx ON "automations"("is_template_published", "published_at");
CREATE INDEX IF NOT EXISTS automation_secrets_automation_idx ON "automation_secrets"("automation_id");
CREATE INDEX IF NOT EXISTS runs_automation_started_idx ON "runs"("automation_id", "started_at");
CREATE INDEX IF NOT EXISTS runs_status_started_idx ON "runs"("status", "started_at");
CREATE INDEX IF NOT EXISTS templates_published_idx ON "templates"("is_published", "published_at");
CREATE INDEX IF NOT EXISTS templates_owner_idx ON "templates"("owner_user_id");

