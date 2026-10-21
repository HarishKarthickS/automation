ALTER TABLE "user" ADD COLUMN IF NOT EXISTS execution_approved boolean NOT NULL DEFAULT false;
