ALTER TABLE runs ADD COLUMN queued_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE runs ADD COLUMN available_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE runs ADD COLUMN admitted_at timestamptz;
ALTER TABLE runs ADD COLUMN lease_token uuid;
ALTER TABLE runs ADD COLUMN lease_expires_at timestamptz;
ALTER TABLE runs ADD COLUMN parent_run_id uuid;
ALTER TABLE runs ADD COLUMN execution_snapshot text;
UPDATE runs SET queued_at=started_at, available_at=started_at,
  admitted_at=CASE WHEN status!='queued' AND coalesce(failure_category,'')!='capacity_limit' THEN started_at END,
  lease_expires_at=CASE WHEN status='running' THEN now() END;
CREATE UNIQUE INDEX runs_parent_unique_idx ON runs(parent_run_id);
CREATE INDEX runs_pending_idx ON runs(status,available_at);
CREATE INDEX runs_admission_idx ON runs(admitted_at);
