ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'user';

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "suspended" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "action" text NOT NULL,
  "resource_type" text NOT NULL,
  "resource_id" text NOT NULL,
  "reason" text NOT NULL,
  "before_json" text,
  "after_json" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_created_idx ON "admin_audit_logs"("admin_user_id", "created_at");
CREATE INDEX IF NOT EXISTS admin_audit_logs_resource_idx ON "admin_audit_logs"("resource_type", "resource_id");

CREATE TABLE IF NOT EXISTS "admin_settings" (
  "key" text PRIMARY KEY,
  "value" text NOT NULL,
  "updated_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
