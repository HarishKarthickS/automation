CREATE TABLE IF NOT EXISTS "onboarding_progress" (
  "user_id" text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  "completed_steps" text[] NOT NULL DEFAULT '{}',
  "dismissed" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
