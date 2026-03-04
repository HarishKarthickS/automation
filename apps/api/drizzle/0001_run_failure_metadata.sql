ALTER TABLE "runs"
ADD COLUMN IF NOT EXISTS "failure_category" text;

ALTER TABLE "runs"
ADD COLUMN IF NOT EXISTS "failure_retriable" boolean;
