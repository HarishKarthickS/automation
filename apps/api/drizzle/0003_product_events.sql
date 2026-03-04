CREATE TABLE IF NOT EXISTS "product_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "metadata" text NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_events_user_created_idx ON "product_events"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS product_events_type_created_idx ON "product_events"("event_type", "created_at");
