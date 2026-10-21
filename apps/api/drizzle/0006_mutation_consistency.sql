ALTER TABLE automation_secrets ADD COLUMN IF NOT EXISTS key_id text NOT NULL DEFAULT 'legacy';
CREATE TABLE IF NOT EXISTS admin_action_tokens (
  token_hash text PRIMARY KEY, actor_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  action text NOT NULL, resource_type text NOT NULL, resource_id text NOT NULL,
  reason text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_action_tokens_expiry_idx ON admin_action_tokens(expires_at);

CREATE TABLE IF NOT EXISTS mutation_requests (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, scope text NOT NULL, request_key text NOT NULL,
  request_hash text NOT NULL, response_json text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, scope, request_key)
);
CREATE INDEX IF NOT EXISTS mutation_requests_created_idx ON mutation_requests(created_at);
